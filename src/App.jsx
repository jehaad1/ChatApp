import "./App.css";
import { createSignal } from "solid-js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, updateDoc, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, setPersistence, browserSessionPersistence, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import Logo from "./assets/Logo.png";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";

const firebaseConfig = {
  apiKey: "AIzaSyD6WEfAIBhBJbwiBjx-hug3TL8Wg4WA7Z0",
  authDomain: "chatapp-21ff3.firebaseapp.com",
  projectId: "chatapp-21ff3",
  storageBucket: "chatapp-21ff3.appspot.com",
  messagingSenderId: "388229594284",
  appId: "1:388229594284:web:0fbaeefeb894c97a87b309",
  measurementId: "G-K97R5JYDF8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();
const provider = new GoogleAuthProvider();
setPersistence(auth, browserSessionPersistence);
const collectionRef = collection(db, "messages");
const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("Visible");
    else entry.target.classList.remove("Visible");
  });
});

let chat = [];
let chatClone = [];
setInterval(() => {
  if(chat.length === 0) return;
  if(chat.children.length === chatClone.length && chatClone.length !== 0) return;
  chatClone = [...chat.children];
  [...chat.children].forEach((child) => observer.observe(child));
}, 500);

const toast = Toastify({
  text: "Tap on the message to edit/delete.",
  duration: 2000,
  newWindow: false,
  close: true,
  gravity: "top",
  position: "center",
  className: "Toast"
});

function App() {
  const [messages, setMessages] = createSignal([]);
  const [message, setMessage] = createSignal("");
  const [profile, setProfile] = createSignal({});
  const [loading, setLoading] = createSignal(true);
  const [editMessage, setEditMessage] = createSignal("");
  const [visibleActions, setVisibleActions] = createSignal("");
  let unSubscribe;
  onAuthStateChanged(auth, (user) => {
    if (user) {
      setLoading(false);
      setProfile({
        username: user.displayName,
        avatar: user.photoURL.split("https://lh3.googleusercontent.com/a/")[1],
        uid: user.uid
      });
      unSubscribe = onSnapshot(collectionRef, (querySnapshot) => {
        const data = querySnapshot.docs.filter(doc => doc.id.includes("-")).map(doc => {
          return {
            time: +doc.id.split("-")[0],
            avatar: `https://lh3.googleusercontent.com/a/${doc.data().avatar}`,
            username: doc.data().username,
            message: doc.data().message,
            uid: doc.id.split("-")[1],
            id: doc.id,
            self: user.uid === doc.id.split("-")[1]
          };
        });
        setMessages(data.sort((a, b) => a.time - b.time));
        setTimeout(() => document.querySelector(".Message:last-child").scrollIntoView(), 100);
      });
    } else {
      setLoading(false);
      setProfile({});
      setMessages([]);
      if(unSubscribe) unSubscribe();
    }
  });
  return (
    <>
    {profile().username && (
      <header>
        <button className="LogoutButton" onClick={() => {
          signOut(auth).catch(() => {});
          }}>Logout
          <i className="fas fa-door-open"></i>
          </button>
          </header>
    )}
    <div className={`App${profile().username ? " LoggedIn" : ""}`}>
    {!profile().username ? (
      <div className="LoginPopup">
        <img className="Logo" src={Logo} />
        {loading() ? (
          <>
          <h1>Welcome back</h1>
          <h4>We're checking if you're logged in</h4>
          </>
        ) : (
          <>
        <h1>Welcome back</h1>
        <h4>Login to access the chat system</h4>
        <div onclick={(e) => {
          signInWithPopup(auth, provider).catch(() => {});
        }} className="GoogleButton">
            <div className="IconWrapper">
                <img className="GoogleIcon" src="./google.svg" />
            </div>
            <p>Login with Google</p>
        </div>
        </>
        )}
      </div>
    ) : (
      <>
      <div ref={chat} className="Chat">
      {messages().map(message => (
        <div style={{"box-shadow": visibleActions() ? visibleActions() === message.id ? "0 0 6px rgba(0, 0, 0, .25)" : "0 3px 4px 0 rgba(0, 0, 0, .25)" : ""}}
        id={message.id}
        className={`Message${!message.self ? " Other" : ""}`}>
          <div className="Profile">
            <img src={message.avatar} />
            <h1>{message.username}</h1>
          </div>
          <div dir={startsWithArabic(message.message) ? "rtl" : "ltr"} className="Content">{message.message}</div>
          <div className="Hide EditTextarea">
            <textarea dir={startsWithArabic(editMessage()) ? "rtl" : "ltr"} oninput={(e) => {
              setEditMessage(e.target.value);
            }}></textarea>
          </div>
            {message.self && (
          <span style={{
            display: visibleActions() ? visibleActions() === message.id ? "flex" : "none" : "",
            "font-size": visibleActions() === message.id ? "1.5rem" : ""
            }} className="MessageActions">
          <i onclick={(e) => {
            if(e.target.classList.contains("fa-trash")) {
            deleteDoc(doc(db, "messages", message.id));
            e.target.parentElement?.remove();
            } else {
              setEditMessage(message.message);
              e.target?.nextElementSibling?.click();
            };
          }} className={`Delete fas fa-times ${visibleActions() !== message.id ? "fa-trash" : ""}`}></i>
          <i onclick={(e) => {
            const textarea = e.target.parentElement?.previousElementSibling;
            const content = e.target.parentElement?.previousElementSibling.previousElementSibling;
              
            if(!e.target.classList.contains("fa-check")) {
              setEditMessage(message.message);
              setVisibleActions(message.id);
              document.querySelector(".CurrentEditMessage .EditTextarea")?.classList.add("Hide");
              document.querySelector(".CurrentEditMessage .Content")?.classList.remove("Hide");
              document.querySelector(".CurrentEditMessage .Edit")?.classList.remove("fa-check");
              document.querySelector(".CurrentEditMessage")?.classList.remove("CurrentEditMessage");
              textarea.querySelector("textarea").value = message.message;
            } else {
              setVisibleActions("");
              if(editMessage() !== message.message) updateDoc(doc(db, "messages", message.id), { message: editMessage() });
            };
            textarea.classList.toggle("Hide");
            content.classList.toggle("Hide");
            e.target.parentElement.parentElement.classList.toggle("CurrentEditMessage");
            e.target.classList.toggle("fa-check");
          }} className="Edit fas fa-pen-to-square"></i>
          </span>
          )}
          </div>
      ))}
      </div>
        <div className="MessageContainer">
          <textarea dir={startsWithArabic(message()) ? "rtl" : "ltr"} oninput={(e) => {
          setMessage(e.target.value);
          }} className="MessageTextarea" placeholder="Say Hi.."></textarea>
          <button onclick={(e) => {
            const ifJustSpaces = new Set(message().split(""));
            if(message() === "" || (ifJustSpaces.size === 1 && ifJustSpaces.has(" "))) return;
            setDoc(doc(db, "messages", `${Date.now()}-${profile().uid}`), {
              message: message(),
              username: profile().username,
              avatar: profile().avatar,
            });
            setMessage("");
            toast.showToast();
            e.target.previousElementSibling.value = "";
          }}>Send</button>
        </div>
        </>
      )}
    </div>
    </>
  )
}

export default App;

function startsWithArabic(str) {
  const arabic = /[\u0600-\u06FF]/;
  return arabic.test(str[0]);
}