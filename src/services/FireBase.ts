// Import the functions you need from the SDKs you need
import {
  DEFAULT_USER_SETTINGS,
  PerformanceSettings,
  PhotoProXUser,
  UserSettings,
} from "@/interfaces/FirebaseInterfaces";
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import {
  Auth,
  GoogleAuthProvider,
  User,
  getAuth,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  Firestore,
  Timestamp,
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  FirebaseStorage,
  UploadMetadata,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { toast } from "sonner";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID,
};

let app;
let user: User | null = null;
let analytics;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

// Check if running in a browser environment
if (typeof window !== "undefined") {
  // Initialize Firebase only in the browser
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);

  analytics = getAnalytics(app);

  // const appCheck = initializeAppCheck(app, {
  //   provider: new ReCaptchaV3Provider(
  //     process.env.NEXT_PUBLIC_SITE_KEY as string
  //   ),

  //   // Optional argument. If true, the SDK automatically refreshes App Check
  //   // tokens as needed.
  //   isTokenAutoRefreshEnabled: true,
  // });

  storage = getStorage(app);
  db = getFirestore(app);
}

export const uploadLayer = async (
  file: File,
  projectId: string,
  userId: string
) => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, `${userId}/${projectId}/${file.name}`);
    const metaData: UploadMetadata = {
      customMetadata: {
        date: Timestamp.now().toDate().toString(),
      },
    };
    const uploadTask = uploadBytesResumable(storageRef, file, metaData);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        "Upload is " + progress + "% done";

        switch (snapshot.state) {
          case "paused":
            "Upload is paused";
            break;
          case "running":
            "Upload is running";
            break;
        }
      },
      async (error) => {
        reject(error); // Reject the promise if there's an error
      },
      async () => {
        try {
          // Resolve the promise when the upload is complete
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          toast("Image saved to PhotoProX Storage", {
            duration: 10000,
            description: "View the image in Profile -> Photos",
            action: {
              label: "Got it!",
              onClick: () => {
                // Undo the copy of the address
              },
            },
          });
          resolve(downloadURL);
        } catch (error) {
          toast.error("Failed to save file. Please try again");
          reject(error); // Reject the promise if there's an error getting the download URL
        }
      }
    );
  });
};

export const handleSignOut = async () => {
  try {
    await signOut(auth);
    // User is signed out
    localStorage.removeItem("welcome");
    // refresh the page to clear the state of the app
    window.location.href = "/";
  } catch (error) {
    // Handle errors
    console.error("Error signing out:", error);
  }
};

export async function getUserState(user: User): Promise<PhotoProXUser> {
  if (user.uid) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as PhotoProXUser;
    } else {
      await ensureUserDocument(user);
      const newUserSnap = await getDoc(userRef);
      return newUserSnap.data() as PhotoProXUser;
    }
  } else {
    throw new Error("User is not signed in");
  }
}

export async function handleUpdateSettings(
  userId: string,
  settings: UserSettings
) {
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    settings: settings,
  });
  toast("Settings successfully updated!", {
    duration: 1500,
    description: "Enjoy your new personalized experience!",
    action: {
      label: "Got it!",
      onClick: () => {
        // Undo the copy of the address
      },
    },
  });
}

async function createDefaultUserDocument(passedUser: User) {
  const defaultDoc: PhotoProXUser = {
    uid: passedUser.uid,
    email: passedUser.email,
    displayName: passedUser.displayName || passedUser.email,
    photoURL: passedUser.photoURL,
    settings: DEFAULT_USER_SETTINGS,
  };
  await setDoc(doc(db, "users", passedUser.uid), defaultDoc);
}

export async function ensureUserDocument(passedUser: User) {
  const docRef = doc(db, "users", passedUser.uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    // Log the document data
  } else {
    await createDefaultUserDocument(passedUser);
    // Create a new document with the user's ID
  }
}

export const handleSignIn = async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
    // User is signed in
  } catch (error) {
    // Handle errors
    console.error("Error signing in:", error);
  }
};

export const uploadFileFromGallery = async (
  file: File,
  post: any,
  userId: string
) => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, `${userId}/gallery/${file.name}`);
    const metaData: UploadMetadata = {
      customMetadata: {
        date: Timestamp.now().toDate().toString(),
        tags: post.tags,
        source: post.source,
      },
    };
    const uploadTask = uploadBytesResumable(storageRef, file, metaData);
    toast("Upload has begun", {
      duration: 3000,
      description: "Please wait for the upload to complete",
      action: {
        label: "Patiently waiting...",
        onClick: () => {
          // Undo the copy of the address
        },
      },
    });
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        "Upload is " + progress + "% done";

        switch (snapshot.state) {
          case "paused":
            "Upload is paused";
            break;
          case "running":
            "Upload is running";
            break;
        }
      },
      async (error) => {
        reject(error); // Reject the promise if there's an error
      },
      async () => {
        try {
          // Resolve the promise when the upload is complete

          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          toast("Image saved to PhotoProX Storage", {
            duration: 10000,
            description: "View the image in Editor -> Profile -> Photos",
            action: {
              label: "Got it!",
              onClick: () => {
                // Undo the copy of the address
              },
            },
          });
          resolve(downloadURL);
        } catch (error) {
          toast.error("Failed to save file. Please try again");
          reject(error); // Reject the promise if there's an error getting the download URL
        }
      }
    );
  });
};

export { analytics, app, auth, db, storage, user };
