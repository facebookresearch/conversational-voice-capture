import React from "react";
import ReactDOM from "react-dom/client";

import { Dialog } from "@headlessui/react";

import HomePage from "./routes/Home";
import GamePage from "./routes/Task";
import TermsAndConditions from "./components/TermsAndConditions";

import "./index.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

function App() {
  const inCall = false;
  let lastSession = null;

  if (typeof localStorage !== "undefined") {
    let readLastStored = localStorage.getItem("last_session");
    if (!!readLastStored) {
      lastSession = JSON.parse(readLastStored);
    }
  }

  return (
    <>
      <div className="mb-36 min-h-screen">
        <AcceptModal />
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            fontSize: "0.8em",
            background: "#eee",
            color: "white",
            padding: "3px 5px",
            fontWeight: "bold",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <a
            href="https://github.com/fairinternal/openvox/issues"
            target="_blank"
          >
            File an issue
          </a>
        </div>
        {lastSession && (
          <div
            style={{
              position: "fixed",
              bottom: 0,
              right: 0,
              fontSize: "0.8em",
              background: "#eee",
              color: "white",
              padding: "3px 5px",
              fontWeight: "bold",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span className="text-slate-500">Last session: {lastSession}</span>
          </div>
        )}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/games/:slugId" element={<GamePage />} />
          </Routes>
        </BrowserRouter>
      </div>

      {!inCall ? null : (
        <div className="fixed bottom-0 right-0 left-0 m-10 rounded-lg border-4 border-black bg-gray-200 p-10 drop-shadow-md	">
          {/* <CallManager /> */}
        </div>
      )}
    </>
  );
}

function AcceptModal() {
  const [isOpen, setIsOpen] = React.useState(true);
  const [inUS, setInUS] = React.useState(false);

  return (
    <Dialog open={isOpen} onClose={() => {}} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-4 dark:bg-gray-900">
          <Dialog.Title className="mb-3 font-bold">
            Terms &amp; Conditions
          </Dialog.Title>
          <Dialog.Description className="mb-3">
            <TermsAndConditions />
          </Dialog.Description>
          <label className="cursor-pointer text-sm">
            <input
              type="checkbox"
              className="align-middle"
              checked={inUS}
              onChange={(e) => setInUS(e.target.checked)}
            />{" "}
            I agree that I'm based in the US.
          </label>
          <div className="mt-4 flex justify-center">
            <button
              disabled={!inUS}
              onClick={() => setIsOpen(false)}
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
            >
              I Agree
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
