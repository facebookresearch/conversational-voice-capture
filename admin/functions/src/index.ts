import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import config from "./config";
import fetch from "cross-fetch";
admin.initializeApp(functions.config().firebase);

const { log, error } = functions.logger;
const dump = (obj: any) => log(JSON.stringify(obj));

function newSessionUpdates(
  snapshot: functions.database.DataSnapshot,
  gameId: string,
  person1: string,
  person2: string,
  person1Ts: string,
  person2Ts: string
) {
  const timestamp = +new Date();
  return [
    snapshot.ref.root.child(`lobby/${gameId}/${person1}`).remove(),
    snapshot.ref.root.child(`lobby/${gameId}/${person2}`).remove(),
    snapshot.ref.root
      .child(`sessions/${gameId}/${timestamp}_${person1}_${person2}`)
      .set({
        users: [person1, person2],
        intentTimestamps: [person1Ts, person2Ts],
        startedAt: timestamp,
        gameId: gameId,
        roomUrl: "",
      }),
  ];
}

export const addToLobbyNewIntent = functions.database
  .ref("/intents/{userId}/{gameId}/{timestamp}")
  .onCreate(async (snapshot, context) => {
    log("[Intent Create] triggered");
    const currentUser = context.params.userId as string;
    const gameId = context.params.gameId as string;
    const timestamp = context.params.timestamp as string;

    const gameLobbyState = ((
      await snapshot.ref.root.child(`lobby/${gameId}`).once("value")
    ).val() || {}) as any;
    const peopleWaiting = Object.keys(gameLobbyState);
    const intentTimesForPeopleWaiting = Object.values(
      gameLobbyState
    ) as string[];

    if (peopleWaiting.indexOf(currentUser) >= 0) {
      // The user is already waiting in the lobby for a previous intent, let's just update the timestamp
      return snapshot.ref.root.child(`lobby/${gameId}/`).update({
        [currentUser as string]: timestamp,
      });
    }

    log("[Current Lobby] " + JSON.stringify(gameLobbyState));

    let pendingSessionUpdates: Promise<void>[] = [];
    // there shouldn't be 2 or more people here already, if so
    // let's match them
    while (peopleWaiting.length >= 2) {
      const [person1, person2] = peopleWaiting.splice(0, 2);
      const [person1Ts, person2Ts] = intentTimesForPeopleWaiting.splice(0, 2);
      pendingSessionUpdates.push(
        ...newSessionUpdates(
          snapshot,
          gameId,
          person1,
          person2,
          person1Ts,
          person2Ts
        )
      );
    }

    if (peopleWaiting.length === 0) {
      const lobbyMergeUpdate = {
        [currentUser as string]: timestamp,
      };
      return Promise.all([
        ...pendingSessionUpdates,
        snapshot.ref.root.child(`lobby/${gameId}`).update(lobbyMergeUpdate),
      ]);
    } else {
      return Promise.all([
        ...pendingSessionUpdates,
        ...newSessionUpdates(
          snapshot,
          gameId,
          peopleWaiting[0],
          currentUser,
          intentTimesForPeopleWaiting[0],
          timestamp
        ),
      ]);
    }
  });

export const monitorIntentStatus = functions.database
  .ref("/intents/{userId}/{gameId}/{timestamp}")
  .onUpdate((change, context) => {
    const gameId = context.params.gameId;
    const userId = context.params.userId;
    const prevVal = change.before.val();
    const newVal = change.after.val();

    // TODO update data model to handle new intents for the same userId/gameId. Should these be an array?

    if (!change.before.exists()) {
      return null;
    }

    // TODO add typings for the intent statuses below
    if (
      prevVal.status === "pending" &&
      ["aborted", "disconnected", "error"].indexOf(newVal.status) >= 0
    ) {
      // remove the user from the lobby
      return change.after.ref.root.child(`lobby/${gameId}/${userId}`).remove();
      // TODO assert userId and gameId exist?
    }

    return null;
  });

export const generateDailyRoomUrl = functions.database
  .ref("/sessions/{gameId}/{sessionId}")
  .onCreate(async (snapshot, context) => {
    const gameId = context.params.gameId;
    const val = snapshot.val() as any;
    if (snapshot.exists() && val.roomUrl !== "") {
      log("a previous value was found, bailing");
      return null;
    }
    if (!process.env.DAILY_API_KEY) {
      error("DAILY_API_KEY is not defined!");
      return null;
    }

    const now = new Date();
    const datePrefix = `${now.getUTCFullYear() % 100}${
      now.getUTCMonth() + 1
    }${now.getUTCDate()}`;
    const timePrefix = `${now.getUTCHours().toString().padStart(2, "0")}${now
      .getUTCMinutes()
      .toString()
      .padStart(2, "0")}${now.getUTCSeconds().toString().padStart(2, "0")}`;

    const userId1 = val.users[0];
    const userId2 = val.users[1];
    const uniqueHash = Math.random().toString(36).substring(2, 5);

    const roomName = `${datePrefix}_${timePrefix}_U${userId1.substring(
      0,
      3
    )}_U${userId2.substring(0, 3)}_${uniqueHash}`;
    log(`Creating room: ${roomName}`);

    const options = {
      name: roomName,
      properties: {
        exp:
          Math.round(now.getTime() / 1000) + 60 * config.DAILY_ROOM_EXP_MINUTES,
        enable_prejoin_ui: false,
        enable_recording: "raw-tracks", // rtp-tracks or cloud or raw-tracks
      },
    };
    log(
      "Sending room creation options payload to Daily.co: ",
      JSON.stringify(options)
    );
    const result = config.DAILY_URL_BYPASS
      ? { url: "test-url" }
      : await fetch(`https://api.daily.co/v1/rooms/`, {
          method: "POST",
          body: JSON.stringify(options),
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + process.env.DAILY_API_KEY,
          },
        })
          .then((res) => res.json())
          .then((res) => {
            log("TEST", res);
            return res;
          })
          .catch((err) => {
            log("TESTERR", err);
            JSON.stringify(err);
          });

    log(JSON.stringify(result));
    const { url: roomUrl } = result;

    // // TODO: It could well be the case that we do not want the latest intent here, and perhaps instead
    // // want the timed intent specific to the lobby?
    // const allUserIntents: string = (
    //   await snapshot.ref.root
    //     .child(`intents/${val.users[0]}/${gameId}`)
    //     .once("value")
    // ).val();
    // log("Looking up latest intent", `${allUserIntents.length} found`);
    // const latestIntent = Object.keys(allUserIntents).sort().slice(-1);

    const { intentTimestamps } = val;

    return Promise.all([
      snapshot.ref.update({ roomUrl }),
      snapshot.ref.root
        .child(`intents/${val.users[0]}/${gameId}/${intentTimestamps[0]}`)
        .update({
          status: "fulfilled",
          roomUrl,
        }),
      snapshot.ref.root
        .child(`intents/${val.users[1]}/${gameId}/${intentTimestamps[1]}`)
        .update({
          status: "fulfilled",
          roomUrl,
        }),
    ]);
  });

export const recordings = functions.https.onRequest(async (req, response) => {
  if (!process.env.DAILY_API_KEY) {
    error("DAILY_API_KEY is not defined!");
    return;
  }

  const body = await fetch("https://api.daily.co" + "/v1/recordings", {
    method: "get",
    redirect: "follow",
    headers: [
      ["Accept", "application/json"],
      ["Authorization", `Bearer ${process.env.DAILY_API_KEY}`],
      ["Content-Type", "application/json"],
    ],
  }).then((res) => {
    if (res.redirected) {
      return res.url;
    }
    return res.json();
  });
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
  return;
});

export const track = functions.https.onRequest(async (req, response) => {
  if (!process.env.DAILY_API_KEY) {
    error("DAILY_API_KEY is not defined!");
    return;
  }

  const body = await fetch("https://api.daily.co" + req.params.url, {
    method: "get",
    redirect: "follow",
    headers: [
      ["Accept", "application/json"],
      ["Authorization", `Bearer ${process.env.DAILY_API_KEY}`],
      ["Content-Type", "application/json"],
    ],
  }).then((res) => {
    if (res.redirected) {
      return res.url;
    }
    return res.json();
  });
  response.end(body);
  return;
});

export const registerIntent = functions.https.onRequest(
  async (req, response) => {
    if (!process.env.DAILY_API_KEY) {
      error("DAILY_API_KEY is not defined!");
      return;
    }
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Content-Type", "application/json");

    const params = JSON.parse(req.body);
    const { userId, gameId, timestamp } = params;
    // assert all required params are passed
    let requiredParams = ["userId", "gameId", "timestamp"];
    let missingParams = requiredParams.filter(
      (paramName) => !(paramName in params)
    );
    if (missingParams.length > 0) {
      response.end(
        JSON.stringify({
          error: `Missing required params: ${missingParams.join(", ")}`,
        })
      );
      return;
    }

    const intents = (
      await admin.database().ref(`intents/${userId}/${gameId}/`).once("value")
    ).val();
    const activeIntents = Object.entries(intents || {}).filter(
      ([timestamp, info]: [string, any]) => info.status === "pending"
    );
    const replacing = activeIntents.length > 0;
    if (replacing) {
      await Promise.all(
        activeIntents.map(([timestamp]) =>
          admin
            .database()
            .ref(`intents/${userId}/${gameId}/${timestamp}`)
            .update({ status: "aborted" })
        )
      );
    }
    await admin.database().ref(`intents/${userId}/${gameId}/${timestamp}`).set({
      status: "pending",
    });

    response.end(
      JSON.stringify({
        status: replacing ? "replaced" : "new",
        timestamp: timestamp,
      })
    );
    return;
  }
);
