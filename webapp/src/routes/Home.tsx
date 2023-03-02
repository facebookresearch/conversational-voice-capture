import { useUserLobbyState, useLobbyStats, useTasks } from "@/api/mock";
import CallManager from "@/components/CallManager";
import React from "react";
import { getUser } from "@/firebase";

function Home() {
  const tasks = useTasks();

  const [gameId, setGameId] = React.useState<number | null>(null);

  const taskDetails = useTasks().find((task) => task.gameId == gameId)!;
  const lobbyStats = useLobbyStats(taskDetails?.gameId);
  const state = useUserLobbyState();

  return (
    <div className="page page-home">
      <h3 className="font-fun text-center">Join a convo!</h3>
      {taskDetails && (
        <div
          className="game-details text-black"
          style={{ textAlign: "center" }}
        >
          <h4>You are playing: {taskDetails.name}</h4>
          <p>{taskDetails.description}</p>
        </div>
      )}
      <CallManager onGameId={(id) => setGameId(id)} />
    </div>
  );
}

export default Home;
