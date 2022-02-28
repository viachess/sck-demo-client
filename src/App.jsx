import { useEffect, useState, useRef } from "react";

import "./App.css";
import PlotlyScatter from "./components/PlotlyScatter";

// case 1 - request data by chunks and append them to current data,
// chunk size: 10,000 ; 20,000; 30,000; 40,000;
// [] { mode: chunks, size: 10k, 20k, 30k, 40k }
// case 2 - request 1 million points initially, then request small samples
// [] {mode: large_set, post_request_size: 1, 5, 10, 15}
// case 3 - ws as data channel. get 500 or 5000 points every 2 seconds
// { mode: live, size: 500 || 5000 }

const SOCKET_PROTOCOL = window.location.protocol === "http:" ? "ws" : "wss";
const API_URL = `${SOCKET_PROTOCOL}://localhost:4422`;

const MEDIUM_PERIODIC_CHUNKS = "MEDIUM_PERIODIC_CHUNKS";
const LARGE_INITIAL_CHUNK = "LARGE_INITIAL_CHUNK";
const SMALL_PERIODIC_CHUNKS = "SMALL_PERIODIC_CHUNKS";

const modes = [
  {
    name: MEDIUM_PERIODIC_CHUNKS,
    initial: 10000,
    chunkSizes: [10000, 20000, 30000, 40000, 50000],
  },
  {
    name: LARGE_INITIAL_CHUNK,
    initialChunk: 1000000,
    chunkSizes: [1, 5, 10, 15],
  },
  {
    name: SMALL_PERIODIC_CHUNKS,
    initialChunk: 500,
    chunkSizes: [500, 1000, 2500, 5000],
  },
];

function App() {
  const [modeName, setModeName] = useState(modes[2].name);
  const [mode, setMode] = useState(modes[2]);
  const [chunkSize, setChunkSize] = useState(modes[2].chunkSizes[0]);
  const socketRef = useRef(null);

  const [xAxisData, setXAxisData] = useState([]);
  const [yAxisData, setYAxisData] = useState([]);
  // function toggleRequestMode() {}

  useEffect(() => {
    function sendMessage(ref, obj) {
      ref.send(JSON.stringify(obj));
    }

    let intervalId;
    function sendIntervalRequest() {
      sendMessage(socketRef.current, {
        modeName,
        chunkSize,
      });
      clearInterval(intervalId);
      intervalId = setInterval(sendIntervalRequest, 2000);
    }
    function setupSocket() {
      socketRef.current = new WebSocket(API_URL);
      socketRef.current.addEventListener("open", (event) => {
        setInterval(sendIntervalRequest, 2000);
      });
      socketRef.current.addEventListener("message", (event) => {
        // console.log("INCOMING DATA");

        const data = JSON.parse(event.data).data;

        const xPoints = data.map((point) => point.x);
        const yPoints = data.map((point) => point.y);
        setXAxisData((prevState) => {
          return [...prevState, ...xPoints];
        });
        setYAxisData((prevState) => {
          return [...prevState, ...yPoints];
        });
      });
    }
    setupSocket();

    return () => {
      socketRef.current.close();
      clearInterval(intervalId);
    };
  }, [modeName, chunkSize]);

  return (
    <div className="App">
      <header>Websocket chart client</header>

      <div>
        <p>
          Current data fetch mode: <b>{modeName}</b>
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
            setModeName(e.target.value);
            const newMode = modes.filter(
              (mode) => mode.name === e.target.value
            )[0];
            setMode(newMode);
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
          onChange={(e) => setChunkSize(Number(e.target.value))}
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
