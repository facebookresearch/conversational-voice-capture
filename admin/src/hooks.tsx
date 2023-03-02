import { ref, get, set, onValue } from "firebase/database";
import { useEffect, useState } from "react";
import { db, getFnConnectionURL } from "@/firebase";

type Intent = {
  userId: string;
  gameId: string;
  timestamp: string;
  info: {
    status: string;
    roomUrl?: string;
  };
};

export function useIntents() {
  const [loading, setLoading] = useState(true);
  const [intents, setIntents] = useState<Intent[]>([]);

  useEffect(() => {
    const intentsRef = ref(db, "intents/");
    const subscription = onValue(intentsRef, (snapshot) => {
      const data = snapshot.val();
      setIntents(data ? shapeIntent(data) : []);
      setLoading(false);
    });

    return () => subscription();
  }, []);

  return {
    intents,
    loading,
  };
}

function shapeIntent(data: any): Intent[] {
  if (data === null) return [];
  console.log(data);
  return Object.entries(data).flatMap(([userId, gameObj]) =>
    Object.entries(gameObj as any).flatMap(([gameId, tsObj]) => {
      return Object.entries(tsObj as any).map(([timestamp, info]) => {
        console.log(timestamp, info);
        return { userId, gameId, info: info as any, timestamp };
      });
    })
  );
}

type GameLobby = {
  gameId: string;
  participants: string[];
  timestamps: string[];
};

export function useLobbyState() {
  const [loading, setLoading] = useState(true);
  const [lobbyState, setLobbyState] = useState<GameLobby[]>([]);

  useEffect(() => {
    const lobbyRef = ref(db, "lobby/");
    const subscription = onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val();
      setLobbyState(data ? shapeLobby(data) : []);
      setLoading(false);
    });

    return () => subscription();
  }, []);

  return { loading, lobbyState };
}

function shapeLobby(data: any): GameLobby[] {
  if (data === null) return [];
  return Object.entries(data).map(([gameId, users]) => {
    return {
      gameId,
      participants: Object.keys(users as string),
      timestamps: Object.values(users as string),
    };
  });
}

type GameSession = {
  gameId: string;
  sessions: {
    users: string[];
    roomUrl: string;
    startedAt: string;
    gameId: string;
  }[];
};

export function useSessions() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<GameSession[]>([]);

  useEffect(() => {
    const sessionsRef = ref(db, "sessions/");
    const subscription = onValue(sessionsRef, (snapshot) => {
      const data = snapshot.val();
      setSessions(data ? shapeSessions(data) : []);
      setLoading(false);
    });

    return () => subscription();
  }, []);

  return { loading, sessions };
}

function shapeSessions(data: any): GameSession[] {
  if (data === null) return [];
  return Object.entries(data).map(([gameId, sessions]: [string, any]) => {
    return {
      gameId,
      sessions: Object.values(sessions).map((sessionInfo: any) => ({
        gameId,
        users: sessionInfo.users as string[],
        roomUrl: sessionInfo.roomUrl as string,
        startedAt: sessionInfo.startedAt as string,
      })),
    };
  });
}

type DailyRecordingsPayload = {
  total_count: number;
  data: DailyRecording[];
};

type DailyRecording = {
  id: string;
  room_name: string;
  start_ts: number;
  status: "string";
  max_participants: number;
  duration: number;
  share_token: "string";
  tracks: DailyTrack[]; // for rtp-streams
};

export type DailyTrack = {
  id: string;
  download_url: string;
  size: number;
  track_start_ts: string;
  track_end_ts: string;
  duration: number;
  resolution: string;
  session_id: string;
  media_tag: string;
  type: string;
  is_owner: boolean;
  user_name: string;
  user_id: string;
};

export function useRecordings() {
  const [loading, setLoading] = useState(true);
  const [recordings, setRecordings] = useState<DailyRecordingsPayload | null>(
    null
  );

  useEffect(() => {
    async function getData() {
      // const recordings = await dailyApi("v1/recordings");
      const recordings = await fetch(getFnConnectionURL() + "/recordings").then(
        (res) => res.json()
      );
      setRecordings(recordings);
      setLoading(false);
    }
    getData();
  }, []);

  return { loading, recordings };
}
