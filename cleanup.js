import { initializeApp } from "firebase/app";
import { getDatabase, ref, remove } from "firebase/database";
export const firebaseConfig = {
    apiKey: "AIzaSyDTXQTVuGPg-KXcc1EXXWr7Bmyin-CRaD8",
    authDomain: "adoniswastetracker.firebaseapp.com",
    databaseURL: "https://adoniswastetracker-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "adoniswastetracker",
    storageBucket: "adoniswastetracker.appspot.com",
    messagingSenderId: "468226752735",
    appId: "1:468226752735:web:2a35022fc4f970094ea96a",
    measurementId: "G-MQR3ZKT2MT"
  };

const firebase = initializeApp(firebaseConfig);
const database = getDatabase(firebase);

const clearPrizesTable = async () => {
  try {
    const prizesRef = ref(database, "prizes");
    await remove(prizesRef);
    console.log("Prizes table cleared successfully.");
  } catch (error) {
    console.error("Error clearing prizes table:", error);
  }
};

// Call the function to clear the table
clearPrizesTable();
