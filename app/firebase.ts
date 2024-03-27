// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { Firestore, Timestamp, getFirestore } from "firebase/firestore";
import {
  FirebaseStorage,
  StorageReference,
  UploadMetadata,
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from "firebase/auth";
import { toast } from "sonner";
import { Post } from "@/utils/galleryInterfaces";
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

  const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(
      process.env.NEXT_PUBLIC_SITE_KEY as string
    ),

    // Optional argument. If true, the SDK automatically refreshes App Check
    // tokens as needed.
    isTokenAutoRefreshEnabled: true,
  });

  storage = getStorage(app);
  db = getFirestore(app);
}

const uploadLayer = async (file: File, projectId: string, userId: string) => {
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
          toast("Imaged saved to PhotoProX Storage", {
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

const uploadFileFromGallery = async (
  file: File,
  post: Post,
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
          toast("Imaged saved to PhotoProX Storage", {
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

export {
  app,
  analytics,
  db,
  storage,
  user,
  auth,
  uploadFileFromGallery,
  uploadLayer,
};
