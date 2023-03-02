import { User } from "../models/user";
import { Task } from "../models/task";

import { ref, set, onValue, get } from "firebase/database";
import { db, getFnConnectionURL, getUser } from "@/firebase";
import React from "react";

export function useUserLobbyState() {
  const [waitingSince, setWaitingSince] = React.useState<string | null>(null);
  React.useEffect(() => {
    const unsub = onValue(ref(db, "/lobby/"), async (snapshot) => {
      // we handle 4 cases below:
      const data = snapshot.val();
      if (!data) {
        // case 1: lobby is not initialized
        setWaitingSince(null);
        return;
      }
      const lobbyEntries = (Object.values(data) as any[]).flatMap(
        (gameGroup: any[]) => Object.entries(gameGroup)
      );
      if (lobbyEntries.length === 0) {
        // case 2; lobby is initialized but no one's in it
        setWaitingSince(null);
        return;
      } else {
        const uid = (await getUser()).uid;

        const userLobbyEntries = lobbyEntries.filter(
          ([userId, timestamp]) => userId === uid
        );

        if (userLobbyEntries.length === 0) {
          // case 3: people in the lobby but not user
          setWaitingSince(null);
          return;
        }

        // case 4: the user is waiting, set the timestamp of their waiting time
        // we ASSUME_ONE_GAME_ID by setting the first index to 0 below
        setWaitingSince(userLobbyEntries[0][1]);
        return;
      }
    });
    return () => unsub();
  });
  return waitingSince;
}

export function waitForLobbyMatch(
  userId: string,
  gameId: number | string,
  timestamp: number | string
): Promise<string> {
  return new Promise((resolve) => {
    const refPath = `intents/${userId}/${gameId}/${timestamp}`;
    let unsub = onValue(ref(db, refPath), (snapshot) => {
      const val = snapshot.val();
      // if (val === null) return;
      if (["aborted", "disconnected", "error"].indexOf(val.status) >= 0) {
        throw new Error("roomUrl wait failed: " + val.status);
      } else if (val.status === "fulfilled") {
        unsub();
        resolve(val.roomUrl);
      }
    });
  });
}

export function registerIntent(
  userId: string,
  gameId: string
): Promise<{ status: string; timestamp: string }> {
  const timestamp = Date.now();
  return fetch(getFnConnectionURL() + "/registerIntent", {
    method: "POST",
    body: JSON.stringify({
      userId,
      gameId,
      timestamp,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if ("error" in data) throw data;
      return data;
    });
}

export function useLobbyStats(gameId: number) {
  const [lobbyCount, setLobbyCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (gameId === null) return;

    const sub = onValue(ref(db, `lobby/${gameId}`), (snapshot) => {
      const lobbyData = snapshot.val();
      const count = Object.keys(lobbyData || {}).length;
      setLobbyCount(count);
    });

    return () => sub();
  });
  // get(ref(db, `lobby/${gameId}`))
  //   .then((r) => r.val())
  //   .then((r) => Object.keys(r).length)
  //   .then((r) => setLobbyCount(r));

  return lobbyCount;
}

export function useTasks(): Task[] {
  return [
    {
      gameId: 400,
      slugId: "tell-story",
      name: "tell me a story!",
      description:
        "One partner will start by telling a personal story, trying to be expressive. The other partner will help add to the conversation.",
      roleNames: ["Partner A", "Partner B"], // TODO replace
      // roleNames: ["Storyteller", "Supportive listener"],
      roleDescriptions: [
        "Tell Partner B a story from your life (examples: your last vacations, your last date, your last movie…)",
        "Listen to Partner A's story, provide supportive responses, and add your own reflections and experiences.",
      ],
    },
    {
      gameId: 401,
      slugId: "chit-chat",
      name: "chit-chat!",
      description:
        "Pick a random topic between both partners and chat about it!",
      roleNames: ["Partner A", "Partner B"], // TODO replace
      // roleNames: ["Speaker A", "Speaker B"],
      roleDescriptions: [
        "Discuss a random topic of you and your partner's choosing.",
        "Discuss a random topic of you and your partner's choosing.",
      ],
    },
    {
      gameId: 402,
      slugId: "debate",
      name: "debate!",
      description:
        "Pick a topic of debate and agree with your partner on who will take which opposing stance on the issue. Participate in an organized debate on the topic.",
      roleNames: ["Partner A", "Partner B"], // TODO replace
      // roleNames: ["Debater A", "Debater B"],
      roleDescriptions: [
        "Take an opposing stance to Debater B",
        "Take an opposing stance to Debater A",
      ],
    },
  ];
}
