import { Link, useParams } from "react-router-dom";
import { useTasks, useLobbyStats } from "@/api/mock";
import CallManager from "@/components/CallManager";

export default function GamePage() {
  const { slugId } = useParams() as { slugId: string };
  const taskDetails = useTasks().find((task) => task.slugId == slugId)!;
  const lobbyStats = useLobbyStats(taskDetails.gameId);

  if (!taskDetails)
    return (
      <div className="page">
        <div className="return-home">
          <Link to="/">&laquo; Return</Link>
        </div>
        404
      </div>
    );

  return (
    <div className="page">
      <div className="return-home">
        <Link to="/">&laquo; Return</Link>
      </div>
      <div style={{ display: "flex" }}>
        {/* <div
          style={{ flex: "none" }}
          className={`game-tile ${taskDetails} emphasize`}
        >
          {taskDetails.name}
        </div> */}
        <div className="task-description mb-4">
          <h3 className="font-fun">
            {taskDetails.name}
            {lobbyStats && lobbyStats !== 0 ? (
              <span className="m-3 inline-flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 p-4 align-middle font-sans text-lg font-bold text-white">
                {lobbyStats}
              </span>
            ) : null}
          </h3>
          <h4>Instructions</h4>
          <p>{taskDetails.description}</p>
        </div>
      </div>
      {/* <CallManager gameId={taskDetails.gameId} /> */}
    </div>
  );
}
