import {
  Alignment,
  Button,
  Card,
  CardProps,
  Elevation,
  Icon,
  Intent,
  Label,
  Navbar,
  NumericInput,
  Spinner,
  Tag,
} from "@blueprintjs/core";
import {
  useIntents,
  useLobbyState,
  useSessions,
  useRecordings,
  // dailyApi,
  DailyTrack,
} from "@/hooks";
import { db, getDBConnectionURL, getFnConnectionURL } from "@/firebase";
import React from "react";
import { ref, set } from "firebase/database";

function App() {
  return (
    <div className="App" key={getDBConnectionURL()}>
      <Navbar className="bp4-dark">
        <Navbar.Group align={Alignment.LEFT}>
          <Navbar.Heading>Admin Interface</Navbar.Heading>
          <Navbar.Divider />
        </Navbar.Group>
        <Navbar.Group align={Alignment.RIGHT}>
          {/* <Button className="bp4-minimal" icon="home" text="Home" /> */}
          {/* <Button className="bp4-minimal" icon="document" text="Files" /> */}
          <div>Connection: {getDBConnectionURL()}</div>
          <Button
            className="ml-4"
            onClick={() => {
              if (
                confirm(
                  "Are you sure you want to completely blow out the database?"
                ) &&
                confirm("Are you really, really sure?") &&
                prompt("Type DELETE to confirm one last time") === "DELETE"
              ) {
                alert("Deleting...");
                set(ref(db, "/"), null);
              }
            }}
          >
            Reset
          </Button>
        </Navbar.Group>
      </Navbar>
      <div className="m-5">
        <div className="flex w-full">
          <LobbyPanel className="mr-4 flex-1" />
          <SessionsPanel className="flex-1" />
        </div>
        <div className="flex w-full">
          <IntentsPanel className="mr-4 flex-1" />
          <RecordingsPanel className="flex-1" />
        </div>
      </div>
    </div>
  );
}

function LobbyPanel(props: CardProps) {
  const { loading, lobbyState } = useLobbyState();
  const { className, ...restProps } = props;
  return (
    <Card
      {...restProps}
      className={"mb-4 " + className}
      elevation={Elevation.TWO}
    >
      <h5 className="mb-4 text-lg font-bold">
        <a href="#">Game Lobbies</a>
      </h5>
      {lobbyState.map((lobby) => (
        <div className="mb-2">
          <h5 className="text-md mb-2 border-b font-bold">
            Lobby for <code>Game #{lobby.gameId}</code>
          </h5>
          {lobby.participants.length === 0 ? (
            <div className="ml-2 italic text-gray-400">Empty</div>
          ) : null}
          {lobby.participants.map((p, i) => (
            <div key={p} className="mb-1 ml-2">
              <code>User #{p}</code> @ <code>{lobby.timestamps[i]}</code>
            </div>
          ))}
        </div>
      ))}
    </Card>
  );
}

function IntentsPanel(props: CardProps) {
  const { loading, intents } = useIntents();
  const { className, ...restProps } = props;
  return (
    <Card {...restProps} className={"mb-4 " + className}>
      {loading ? (
        <Spinner size={20} />
      ) : (
        <div className="bp4-loading">
          <>
            <h5 className="mb-4 text-lg font-bold">
              <a href="#">User Intents</a>
            </h5>
            <IntentCreator />
            {intents.map((intent) => (
              <div
                className="mb-2"
                key={
                  intent.userId + "_" + intent.gameId + "_" + intent.timestamp
                }
              >
                <code>User #{intent.userId}</code> wants to play{" "}
                <code>Game #{intent.gameId}</code> at{" "}
                <code>{intent.timestamp}</code>
                <Tag
                  className="ml-3"
                  round
                  minimal={
                    ["disconnected", "error", "fulfilled", "aborted"].indexOf(
                      intent.info.status
                    ) >= 0
                  }
                  intent={
                    {
                      pending: Intent.PRIMARY,
                      error: Intent.DANGER,
                      fulfilled: Intent.SUCCESS,
                    }[intent.info.status]
                  }
                >
                  {intent.info.status}
                </Tag>
                {intent.info.status === "pending" ? (
                  <Button
                    className="ml-3"
                    small
                    onClick={() => {
                      set(
                        ref(
                          db,
                          `intents/${intent.userId}/${intent.gameId}/${intent.timestamp}`
                        ),
                        {
                          status: "aborted",
                        }
                      );
                    }}
                  >
                    Abort
                  </Button>
                ) : null}
                {intent.info.roomUrl && (
                  <span className="ml-2">{intent.info.roomUrl}</span>
                )}
              </div>
            ))}
          </>
        </div>
      )}
    </Card>
  );
}

function SessionsPanel(props: CardProps) {
  const { loading, sessions } = useSessions();
  const { className, ...restProps } = props;
  return (
    <Card {...restProps} className={"mb-4 " + className}>
      <h5 className="mb-4 text-lg font-bold">
        <a href="#">Active Sessions</a>
      </h5>
      {sessions.map((gameSession) => (
        <div className="mb-2" key={gameSession.gameId}>
          <h5 className="text-md mb-2 border-b font-bold">
            <code>Game #{gameSession.gameId}</code>
          </h5>
          {gameSession.sessions.map((session) => (
            <div className="mb-2" key={session.users.join(",")}>
              Session between <code>User #{session.users[0]}</code> and{" "}
              <code>User #{session.users[1]}</code>
              <div className="text-xs">
                <span className="mr-4">
                  {Math.floor(
                    (Date.now() - parseInt(session.startedAt, 10)) / 60000
                  )}{" "}
                  mins ago
                </span>
                <code className="mr-4">{session.roomUrl}</code>
              </div>
            </div>
          ))}
        </div>
      ))}
    </Card>
  );
}

function IntentCreator() {
  const [userId, setUserId] = React.useState(100);
  const [gameId, setGameId] = React.useState(400);
  return (
    <Card className="mb-4">
      <Label>
        User ID
        <NumericInput value={userId} onValueChange={(val) => setUserId(val)} />
      </Label>
      <Label>
        Game ID
        <NumericInput value={gameId} onValueChange={(val) => setGameId(val)} />
      </Label>
      <Button
        onClick={async () => {
          const timestamp = Date.now();
          await fetch(getFnConnectionURL() + "/registerIntent", {
            method: "POST",
            body: JSON.stringify({
              userId,
              gameId,
              timestamp,
            }),
          }).then((res) => res.json());
        }}
      >
        Simulate Intent
      </Button>
    </Card>
  );
}

function RecordingsPanel(props: CardProps) {
  const { loading, recordings } = useRecordings();
  const { className, ...restProps } = props;
  return (
    <Card {...restProps} className={"mb-4 overflow-hidden " + className}>
      <h5 className="mb-4 text-lg font-bold">
        <a href="#">Recordings ({recordings && recordings.total_count})</a>
      </h5>
      {recordings && recordings.data && (
        <div>
          {recordings.data
            .filter((r) => !!r.duration)
            .map((r) => (
              <div key={r.id}>
                Duration: {r.duration || "?"}s on{" "}
                {new Date(r.start_ts * 1000).toLocaleString()} / {r.status}{" "}
                <code className="text-xs">{r.room_name}</code>
                <div className="mb-4">
                  {Object.entries(
                    r.tracks.reduce(
                      (a, v) => ({ ...a, [v.user_name]: v }),
                      {}
                    ) as Record<string, DailyTrack>
                  ).map(([u, t]) => (
                    <Button
                      key={t.user_name}
                      small
                      disabled
                      className="mr-2 inline-block"
                      icon="user"
                      onClick={async () => {
                        // const url = await dailyApi(t.download_url, null, "get");
                        // prompt("Download URL:", url);
                      }}
                    >
                      {t.user_name} ({t.duration?.toFixed(1)}s)
                    </Button>
                  ))}
                </div>
                {r.tracks.length === 0 && (
                  <Button
                    className="mr-2"
                    small
                    icon="cloud-download"
                    disabled
                    onClick={async () => {
                      // const url = await dailyApi(
                      //   `v1/recordings/${r.id}/access-link`
                      // );
                      // prompt(
                      //   "Download URL:",
                      //   url.download_link || "error: link expired?"
                      // );
                    }}
                  >
                    Download Full
                  </Button>
                )}
              </div>
            ))}
          <pre className="w-100 mt-6 overflow-x-scroll">
            {JSON.stringify(recordings, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
}

export default App;
