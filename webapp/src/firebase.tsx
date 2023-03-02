import { initializeApp } from "firebase/app";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { getAuth, connectAuthEmulator, signInAnonymously } from "firebase/auth";

const USE_LOCAL_EMULATOR = import.meta.env.VITE_USE_REMOTE !== "true";
// const USE_LOCAL_EMULATOR = false;

const DB_EMULATOR_PORT = 9000;
const AUTH_EMULATOR_PORT = 9099;
const FN_EMULATOR_PORT = 5001;

const firebaseConfig = {
  apiKey: "AIzaSyDvhfY3Mbk0elIPtFtkAjG8yJgjTJDgzbI",
  authDomain: "openvox-dev-dqaa5.firebaseapp.com",
  projectId: "openvox-dev-dqaa5",
  storageBucket: "openvox-dev-dqaa5.appspot.com",
  messagingSenderId: "44215600965",
  appId: "1:44215600965:web:137b6d4e03d9b447f7a02c",
  databaseURL: USE_LOCAL_EMULATOR
    ? `localhost:${DB_EMULATOR_PORT}?ns=openvox-dev-dqaa5-default-rtdb`
    : "https://openvox-dev-dqaa5-default-rtdb.firebaseio.com/",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

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
  connectAuthEmulator(auth, `http://localhost:${AUTH_EMULATOR_PORT}`);
}

const getUser = () => signInAnonymously(auth).then((cred) => cred.user);

export { app, db, auth, getDBConnectionURL, getFnConnectionURL, getUser };
