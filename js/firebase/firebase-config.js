import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBisrZVwjThqyGH5iZ2-LBYI28ZvDOxbyI',
  authDomain: 'coup-master-3d.firebaseapp.com',
  databaseURL: 'https://coup-master-3d-default-rtdb.firebaseio.com',
  projectId: 'coup-master-3d',
  storageBucket: 'coup-master-3d.firebasestorage.app',
  messagingSenderId: '618918013417',
  appId: '1:618918013417:web:4487f8d6429535c0f28378',
  measurementId: 'G-YRGZ28W7K2'
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const database = getDatabase(firebaseApp);
