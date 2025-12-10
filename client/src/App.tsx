import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/")
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error(err));
  }, []);

  return (
    <div style={{ textAlign: "center", paddingTop: "50px" }}>
      <h1>Automation Dashboard Client ✅</h1>
      <p>{message || "Connecting to server..."}</p>
    </div>
  );
}

export default App;
