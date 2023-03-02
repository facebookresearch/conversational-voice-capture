import React, { useEffect } from "react";
import DailyIframe, {
  DailyCall,
  DailyEvent,
  DailyEventObjectActiveSpeakerChange,
} from "@daily-co/daily-js";
import {
  DailyProvider,
  useDailyEvent,
  useParticipantIds,
  useLocalSessionId,
  useParticipantProperty,
  useDaily,
} from "@daily-co/daily-react-hooks";

import * as api from "@/api";
import { getUser } from "@/firebase";
import { useTasks, useUserLobbyState, waitForLobbyMatch } from "@/api";
import PostMeetingSurvey from "./PostMeetingSurvey";
import roomUrlToSessionID from "../utils";

const SINGLE_GAME_ID = 100;

enum CallState {
  IDLE,
  SEARCHING,
  JOINING,
  JOINED,
  LEAVING,
  ERROR,
}

const SHOULD_RECORD = true;

const negotiateRole = function (
  daily: DailyCall,
  orderedParticipantIds: string[]
) {
  const roles = ["Partner A", "Partner B"];
  const all = daily.participants();
  const { local } = all;
  const orderedParticipants = orderedParticipantIds.map((id) =>
    local.session_id === id ? local : all[id]
  );
  const takenRoles = orderedParticipants
    .map((p) => p.user_name)
    .filter((name) => name !== "Pending");
  const unassignedParticipantIds = orderedParticipants
    .filter((p) => p.user_name === "Pending")
    .map((p) => p.session_id);
  const remainingRoles = roles.filter((role) => !takenRoles.includes(role));

  if (local.user_name === "Pending") {
    let localIndex = unassignedParticipantIds.findIndex(
      (id) => local.session_id === id
    );
    // localIndex = remainingRoles.length - 1;
    // localIndex = 0;
    console.log(
      `Setting username from ${local.user_name} to ${
        remainingRoles[localIndex]
      } (${localIndex}, ${JSON.stringify({ remainingRoles })})`
    );
    daily.setUserName(remainingRoles[localIndex]);
  }
};

// Audio-only call flow logic sourced from:
// https://www.daily.co/blog/create-audio-only-meetings-with-daily/
export default function CallManager({
  onGameId,
}: {
  onGameId: (gameId: number | null) => void;
}) {
  const [callState, setCallState] = React.useState(CallState.IDLE);
  const [callObject, setCallObject] = React.useState<DailyCall | null>(null);
  const [roomUrl, setRoomUrl] = React.useState<string | null>(null);

  const inCall = [
    CallState.JOINING,
    CallState.JOINED,
    CallState.ERROR,
  ].includes(callState);

  const startJoiningCall = React.useCallback(
    ({ roomUrl }: { roomUrl: string }) => {
      const newCallObject = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: false,
        dailyConfig: {
          experimentalChromeVideoMuteLightOff: true,
        },
      });
      setCallObject(newCallObject);
      setCallState(CallState.JOINING);
      newCallObject.join({ url: roomUrl, userName: "Pending" }).then(() => {
        newCallObject?.setLocalAudio(true);
      });
    },
    []
  );

  const expressJoinIntent = React.useCallback(
    (gameId: number) => {
      // register intent in Firebase and listen for roomURL update
      setCallState(CallState.SEARCHING);
      getUser().then(({ uid }) =>
        api
          .registerIntent(uid, "" + gameId)
          .then(({ timestamp }) => waitForLobbyMatch(uid, gameId, timestamp))
          .then((roomUrl) => setRoomUrl(roomUrl))
      );
    },
    [startJoiningCall]
  );

  React.useEffect(() => {
    if (!!roomUrl && typeof localStorage !== "undefined") {
      localStorage.setItem("schema_version", "0.0.1");
      localStorage.setItem("last_session", JSON.stringify(roomUrl));
    }
  }, [roomUrl]);

  const intentTimestamp = useUserLobbyState();
  React.useEffect(() => {
    if (!intentTimestamp) return;
    setCallState(CallState.SEARCHING);
    getUser()
      .then(({ uid }) =>
        waitForLobbyMatch(uid, SINGLE_GAME_ID /*gameId */, intentTimestamp)
      ) // ASSUME_ONE_GAME_ID
      .then((roomUrl) => setRoomUrl(roomUrl));
  }, [intentTimestamp]);

  React.useEffect(() => {
    if (!roomUrl) return;
    startJoiningCall({ roomUrl: roomUrl });
  }, [roomUrl]);

  const startLeavingCall = React.useCallback(() => {
    if (!callObject) return;
    // If we're in the error state, we've already "left", so just clean up
    if (callState === CallState.ERROR) {
      callObject.destroy().then(() => {
        setCallObject(null);
        setCallState(CallState.IDLE);
      });
    } else {
      setCallState(CallState.LEAVING);
      /* This will trigger a `left-meeting` event, which in turn will trigger the full clean-up as seen in handleNewMeetingState() below. */
      callObject.leave();
    }
  }, [callObject, callState]);
  // React.useEffect(() => () => startLeavingCall(), [startLeavingCall]);

  React.useEffect(() => {
    if (!callObject) return;

    const events: DailyEvent[] = [
      "joined-meeting",
      "left-meeting",
      "error",
      "camera-error",
    ];

    function handleNewMeetingState() {
      if (!callObject) return;

      switch (callObject.meetingState()) {
        case "joined-meeting":
          setCallState(CallState.JOINED);
          // negotiateRole(callObject);
          break;
        case "left-meeting":
          callObject.destroy().then(() => {
            setCallObject(null);
            setCallState(CallState.IDLE);
          });
          break;
        case "error":
          setCallState(CallState.ERROR);
          break;
        default:
          break;
      }
    }

    // Use initial state
    handleNewMeetingState();

    // Listen for changes in state
    for (const event of events) {
      /*
        We can't use the useDailyEvent hook (https://docs.daily.co/reference/daily-react-hooks/use-daily-event) for this
        because right now, we're not inside a <DailyProvider/> (https://docs.daily.co/reference/daily-react-hooks/daily-provider)
        context yet. We can't access the call object via daily-react-hooks just yet, but we will later in Call.js.
      */
      callObject.on(event, handleNewMeetingState);
    }

    // Stop listening for changes in state
    return function cleanup() {
      for (const event of events) {
        callObject.off(event, handleNewMeetingState);
      }
    };
  }, [callObject]);

  return (
    <div className="join">
      {!inCall ? (
        callState == CallState.SEARCHING ? (
          <>
            <button disabled>Join</button>
            <h2>Searching for a partner...</h2>
          </>
        ) : (
          <button onClick={() => expressJoinIntent(SINGLE_GAME_ID)}>
            Join
          </button>
        )
      ) : (
        <button onClick={startLeavingCall}>Leave</button>
      )}
      {roomUrl && !callObject ? (
        <div>
          <PostMeetingSurvey sessionId={roomUrl} />
        </div>
      ) : null}

      {/* <button onClick={startJoiningCall}>Join as Participant B</button> */}
      {callObject && (
        <DailyProvider callObject={callObject}>
          <Call onGameId={onGameId} roomUrl={roomUrl} />
        </DailyProvider>
      )}
    </div>
  );
}

function Call({
  onGameId,
  roomUrl,
}: {
  roomUrl: string | null;
  onGameId: (gameId: number | null) => void;
}) {
  const daily = useDaily();
  if (!daily) return null; // TODO handle this unexpected case more gracefully

  const [gameId, setGameId] = React.useState<number | null>();
  const [isTimeUp, setIsTimeUp] = React.useState(false);

  const [activeSpeaker, setActiveSpeaker] = React.useState<string | null>(null);
  const localSessionId = useLocalSessionId();
  const userName = useParticipantProperty(
    localSessionId as string, // TODO figure out a way to avoid typing with as. added to avoid conditionally running this hook
    "user_name"
  );

  const allParticipantIds = useParticipantIds({ sort: "joined_at" }).sort(
    (a, b) => a.localeCompare(b)
  );
  const participantsKey = allParticipantIds.join("/");
  const isPartnerConnected = allParticipantIds.length > 1;
  console.log({ allParticipantIds });

  const didPartnerEverConnect = React.useRef(isPartnerConnected);

  useEffect(() => {
    didPartnerEverConnect.current ||= isPartnerConnected;
  }, [isPartnerConnected]);

  const designatedLeaderId = isPartnerConnected ? allParticipantIds[0] : null;
  const leaderData: any = useParticipantProperty(
    designatedLeaderId || "",
    "userData"
  );
  const receivedGameId = leaderData?.gameId;
  const isSelfLeader = localSessionId === designatedLeaderId;

  React.useEffect(() => {
    if (!isPartnerConnected) return;
    if (isSelfLeader && !receivedGameId) {
      const games = useTasks();
      const randomGameIdx = Math.floor(Math.random() * games.length);
      const randomGame = games[randomGameIdx];
      const randomlyPickedGameId = randomGame.gameId;
      daily.setUserData({ gameId: randomlyPickedGameId });
      onGameId(randomlyPickedGameId);
      setGameId(randomlyPickedGameId);
      console.log("setting gameId: ", receivedGameId);
    } else {
      console.log("received gameId: ", receivedGameId);
      onGameId(receivedGameId);
      setGameId(receivedGameId);
    }
  }, [receivedGameId, isSelfLeader, isPartnerConnected]);

  React.useEffect(() => {
    if (!isPartnerConnected) {
      if (SHOULD_RECORD) {
        console.log("🔈 stopping recording");
        daily.stopRecording();
      }
      return;
    }
    negotiateRole(daily, allParticipantIds);
    if (SHOULD_RECORD) {
      console.log("🔈 starting to record");
      daily.startRecording();
    }
  }, [participantsKey, isPartnerConnected]);

  useDailyEvent(
    "active-speaker-change",
    React.useCallback((evt: DailyEventObjectActiveSpeakerChange) => {
      setActiveSpeaker(evt.activeSpeaker.peerId);
    }, [])
  );
  useDailyEvent(
    "track-started",
    React.useCallback((evt) => {
      console.log(
        "[TRACK STARTED]",
        evt.participant && evt.participant.session_id
      );

      // sanity check to make sure this is an audio track
      if (!(evt.track && evt.track.kind === "audio")) {
        console.error("!!! playTrack called without an audio track !!!", evt);
        return;
      }

      // don't play the local audio track (echo!)
      if (evt.participant.local) {
        return;
      }

      let audioEl = document.createElement("audio");
      document.body.appendChild(audioEl);
      audioEl.srcObject = new MediaStream([evt.track]);
      audioEl.play();
    }, [])
  );

  useDailyEvent(
    "track-stopped",
    React.useCallback((evt) => {
      console.log(
        "[TRACK STOPPED]",
        (evt.participant && evt.participant.session_id) || "[left meeting]"
      );

      // technically we are only using audio elements but
      // we'll just copy the tutorial code
      let els = Array.from<HTMLAudioElement>(
        document.getElementsByTagName("video")
      ).concat(Array.from(document.getElementsByTagName("audio")));
      for (let el of els) {
        if (el.srcObject && el.srcObject instanceof MediaStream) {
          if (el.srcObject.getTracks()[0] === evt.track) el.remove();
        }
      }
    }, [])
  );

  useDailyEvent(
    "app-message",
    React.useCallback((evt) => {}, [])
  );

  useDailyEvent(
    "participant-joined",
    React.useCallback((evt) => {}, [])
  );

  useDailyEvent(
    "participant-left",
    React.useCallback((evt) => {}, [])
  );

  const taskDetails = api.useTasks().find((task) => task.gameId === gameId);
  const roleName = useParticipantProperty(localSessionId || "", "user_name");

  console.log({ roleName, taskDetails, gameId });

  const descriptionForRole =
    taskDetails?.roleDescriptions[taskDetails.roleNames.indexOf(roleName)];

  const partnerLeft = !isPartnerConnected && didPartnerEverConnect.current;
  React.useEffect(() => {
    if (partnerLeft) {
      onGameId(null);
      setGameId(null);
    }
  }, [partnerLeft]);

  return (
    <div>
      {!isPartnerConnected ? (
        didPartnerEverConnect.current ? (
          <div>
            <h2>Partner left the call!</h2>
            <PostMeetingSurvey sessionId={roomUrl} />
          </div>
        ) : (
          <h2>Partner found, waiting for them to join the call...</h2>
        )
      ) : (
        <div>
          <p className="my-4 bg-amber-50 p-2 font-bold text-black">
            [BETA] Your role: {descriptionForRole}
          </p>
          {isTimeUp ? (
            <div className="my-4 text-xl font-bold">
              <strong className="text-orange-700">
                Time's up! Wrap up the call.
              </strong>{" "}
              Thank you for your participation!
            </div>
          ) : (
            <Timer
              mins={15}
              onComplete={() => {
                setIsTimeUp(true);
              }}
            />
          )}
          <p>
            <label style={{ marginRight: 10 }}>Participants:</label>
            {allParticipantIds.map((id) => (
              <ParticipantInfo
                key={id}
                id={id}
                isActive={id === activeSpeaker}
                isLocal={id === localSessionId}
              />
            ))}
          </p>
          <div className="mt-4">
            {
              roomUrl && (
                <small>
                  [DEBUG-ONLY] session-id: {roomUrlToSessionID(roomUrl)}.<br />
                  If you would like this session removed, email us at{" "}
                  <a
                    href={`mailto:cvc_dogfooding@meta.com?subject=Requesting%20deletion%3A%20${roomUrlToSessionID(
                      roomUrl
                    )}&body=Requesting%20deletion%20for%3A%20${roomUrlToSessionID(
                      roomUrl
                    )}%0D%0A%0D%0A(Optional)%20Reason%3A`}
                  >
                    cvc_doogfooding@meta.com
                  </a>{" "}
                  with the session-id.
                </small>
              ) /* mailto: link generated with https://mailtolink.me/ */
            }
          </div>
        </div>
      )}
    </div>
  );
}

function ParticipantInfo({
  id,
  isActive,
  isLocal,
}: {
  id: string;
  isActive: boolean;
  isLocal: boolean;
}) {
  const info = useParticipantProperty(id, "user_name");
  return (
    <em
      style={{
        textDecoration: isActive ? "underline" : "none",
        fontWeight: isLocal ? "bold" : "normal",
        marginRight: 10,
      }}
    >
      {info} {isLocal ? "(You)" : ""}{" "}
      <span style={{ visibility: isActive ? "visible" : "hidden" }}>🔉</span>
    </em>
  );
}

function Timer({
  mins = 15,
  onComplete = () => {},
}: {
  mins: number;
  onComplete: () => void;
}) {
  const startTime = Date.now();
  const [elapsed, setElapsed] = React.useState(0);

  const remaining = mins * 60 - elapsed;
  function formatTime(timeSeconds: number) {
    const minutes = Math.floor(timeSeconds / 60);
    const seconds = timeSeconds % 60;
    const padTo2Digits = (num: number) => num.toString().padStart(2, "0");
    return `${padTo2Digits(minutes)}:${padTo2Digits(seconds)}`;
  }

  React.useEffect(() => {
    const timerRef = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = mins * 60 - elapsed;
      if (remaining < 0) {
        clearTimeout(timerRef);
        setElapsed(0);
        onComplete();
      } else {
        setElapsed(elapsed);
      }
    }, 1000);
    return () => clearTimeout(timerRef);
  }, []);

  return <h2 className="remaining-time">{formatTime(remaining)}</h2>;
}
