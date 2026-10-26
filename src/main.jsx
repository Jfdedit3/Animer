import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { Slide, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import App from "./App.jsx";
import InterfacePreferences from "./components/InterfacePreferences";
import { platform } from "./platform/index.js";
import "./index.css";
import "./styles/yoru.css";
import "./styles/glass.css";
import "./styles/web.css";
import WebInstall from "./components/WebInstall.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <InterfacePreferences />
      <WebInstall />
      <App />

      {platform.isMobile ? (
        <ToastContainer
          theme="dark"
          position="bottom-center"
          autoClose={2600}
          transition={Slide}
          icon={false}
          limit={1}
          closeButton={false}
          hideProgressBar
          pauseOnFocusLoss={false}
          pauseOnHover={false}
          draggable="touch"
          draggableDirection="y"
          draggablePercent={30}
        />
      ) : (
        <ToastContainer theme="dark" position="bottom-right" autoClose={3500} />
      )}
    </HashRouter>
  </React.StrictMode>,
);
