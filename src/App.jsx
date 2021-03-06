import { useEffect, useState, useRef } from "react";

import "./App.css";
import PlotlyScatter from "./components/PlotlyScatter";
import { nanoid } from "nanoid";

const dev = "DEVELOPMENT";
const prod = "PRODUCTION";

const SOCKET_PROTOCOL = window.location.protocol === "http:" ? "ws" : "wss";
const env = prod;
const domain =
  env === dev ? "localhost:4422" : "socket-chart-demo.herokuapp.com";
const API_URL = `${SOCKET_PROTOCOL}://${domain}/chart-socket`;

const MEDIUM_PERIODIC_CHUNKS = "MEDIUM_PERIODIC_CHUNKS";
const LARGE_INITIAL_CHUNK = "LARGE_INITIAL_CHUNK";
const SMALL_PERIODIC_CHUNKS = "SMALL_PERIODIC_CHUNKS";

const modes = [
  {
    name: SMALL_PERIODIC_CHUNKS,
    initialChunkSize: 500,
    chunkSizes: [500, 1000, 2500, 5000],
  },
  {
    name: LARGE_INITIAL_CHUNK,
    initialChunkSize: 1000000,
    chunkSizes: [1, 5, 10, 15],
  },
  {
    name: MEDIUM_PERIODIC_CHUNKS,
    initialChunkSize: 10000,
    chunkSizes: [10000, 20000, 30000, 40000, 50000],
  },
];

function App() {
  const [mode, setMode] = useState(modes[0]);
  const [chunkSize, setChunkSize] = useState(0);
  const chunkSizeRef = useRef(null);
  const socketRef = useRef(null);
  const dataHashRef = useRef(null);
  // const intervalIdRef = useRef(null);
  const [xAxisData, setXAxisData] = useState([]);
  const [yAxisData, setYAxisData] = useState([]);

  useEffect(() => {
    if (!Boolean(chunkSize)) {
      const selectedChunkSizeOption = Number(
        chunkSizeRef.current.options[chunkSizeRef.current.selectedIndex].value
      );
      setChunkSize(selectedChunkSizeOption);
      return;
    }
    if (socketRef.current) {
      socketRef.current.close();
    }

    function sendMessage(ref, obj) {
      // console.log("sent message: ");
      // console.log(JSON.stringify(obj));
      ref.send(JSON.stringify(obj));
    }

    let intervalId;
    function sendIntervalRequest() {
      clearInterval(intervalId);
      intervalId = setInterval(sendIntervalRequest, 3000);
      if (!!chunkSize) {
        const hash = nanoid();
        dataHashRef.current = hash;

        sendMessage(socketRef.current, {
          name: mode.name,
          chunkSize: chunkSize,
          initialChunkSize: mode.initialChunkSize,
          hash,
        });
      }
    }

    function setupSocket() {
      socketRef.current = new WebSocket(API_URL);

      socketRef.current.addEventListener("open", (event) => {
        intervalId = setInterval(sendIntervalRequest, 3000);
      });

      socketRef.current.addEventListener("message", (event) => {
        const { data, hash } = JSON.parse(event.data);
        if (data.length > 0 && dataHashRef.current === hash) {
          const xPoints = data.map((point) => point.x);
          const yPoints = data.map((point) => point.y);
          setXAxisData((prevState) => {
            return [...prevState, ...xPoints];
          });
          setYAxisData((prevState) => {
            return [...prevState, ...yPoints];
          });
        }
      });
      socketRef.current.addEventListener("close", (event) => {
        clearInterval(intervalId);
      });
    }
    setupSocket();
    return () => {
      socketRef.current.close();
    };
  }, [mode, chunkSize]);

  return (
    <div className="App">
      <header>Websocket chart client</header>

      <div>
        <p>
          Current data fetch mode: <b>{mode.name}</b>
        </p>
        <p>
          Requested chunk size: <b>{chunkSize}</b> points
        </p>
      </div>
      <div>
        Select mode:
        <select
          name="modes-select"
          id="modes-select"
          className="selectEl"
          onChange={(e) => {
            const newMode = modes.filter(
              (mode) => mode.name === e.target.value
            )[0];
            setMode(newMode);
            setChunkSize(newMode.chunkSizes[0]);
            setYAxisData([]);
            setXAxisData([]);
          }}
        >
          {modes.map((mode) => {
            return (
              <option key={mode.name} value={mode.name}>
                {mode.name.split("_").join(" ")}
              </option>
            );
          })}
        </select>
      </div>
      <div>
        Select chunk size:
        <select
          name="chunkSize-select"
          id="chunkSize-select"
          className="selectEl"
          ref={chunkSizeRef}
          onChange={(e) => {
            const newValue = Number(e.target.value);
            setChunkSize(newValue);
          }}
        >
          {mode.chunkSizes.map((size) => {
            return (
              <option key={size} value={size}>
                {size}
              </option>
            );
          })}
        </select>
      </div>
      <PlotlyScatter
        data={[
          {
            mode: "lines",
            x: xAxisData,
            y: yAxisData,
            type: "scattergl",
            marker: {
              color: "blue",
            },
          },
        ]}
        layout={{ width: 1200, height: 700, title: "Random websocket data" }}
      />
    </div>
  );
}

export default App;
