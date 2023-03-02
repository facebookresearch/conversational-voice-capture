import { initializeApp } from "firebase/app";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { getFunctions } from "firebase/functions";

const USE_LOCAL_EMULATOR = import.meta.env.VITE_USE_REMOTE !== "true";
// const USE_LOCAL_EMULATOR = false;

const DB_EMULATOR_PORT = 9000;
const FN_EMULATOR_PORT = 5001;

const firebaseConfig = {
  apiKey: "AIzaSyDvhfY3Mbk0elIPtFtkAjG8yJgjTJDgzbI",
  authDomain: "openvox-dev-dqaa5.firebaseapp.com",
  projectId: "openvox-dev-dqaa5",
  storageBucket: "openvox-dev-dqaa5.appspot.com",
  messagingSenderId: "44215600965",
  appId: "1:44215600965:web:137b6d4e03d9b447f7a02c",
  databaseURL: "https://openvox-dev-dqaa5-default-rtdb.firebaseio.com/",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const functions = getFunctions(app);

console.log({ USE_LOCAL_EMULATOR }, firebaseConfig);

let getDBConnectionURL = () =>
  USE_LOCAL_EMULATOR
    ? `//localhost:${DB_EMULATOR_PORT}`
    : firebaseConfig.databaseURL;

let getFnConnectionURL = () =>
  USE_LOCAL_EMULATOR
    ? `//localhost:${FN_EMULATOR_PORT}/${firebaseConfig.projectId}/us-central1`
    : `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net`;

if (USE_LOCAL_EMULATOR) {
  connectDatabaseEmulator(db, "localhost", DB_EMULATOR_PORT);
}

export { app, db, functions, getDBConnectionURL, getFnConnectionURL };
