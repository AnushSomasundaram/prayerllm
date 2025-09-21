// // import { useState } from 'react'

// // export default function PrayerPage() {
// //   const [text, setText] = useState('')

// //   function handleSubmit(e) {
// //     e.preventDefault()
// //     // For now we do nothing with it; later you’ll call your API here.
// //     // Example (later): await fetch('/api/pray', { method: 'POST', body: JSON.stringify({ prayer: text }) })
// //     alert('Captured! (No API call yet)') // temporary so you see it’s wired
// //   }

// //   return (
// //     <main
// //       style={{
// //         minHeight: 'calc(100vh - 57px)',
// //         display: 'grid',
// //         placeItems: 'center',
// //         padding: '24px',
// //       }}
// //     >
// //       <section style={{ width: '100%', maxWidth: 720 }}>
// //         <h2 style={{ fontSize: 24, marginBottom: 12 }}>
// //         Lay your thoughts before me, my dear one.
// //         </h2>

// //         <form onSubmit={handleSubmit}>
// //           <label htmlFor="prayer" style={{ display: 'block', marginBottom: 8 }}>
            
// //           </label>
// //           <textarea
// //             id="prayer"
// //             value={text}
// //             onChange={(e) => setText(e.target.value)}
// //             rows={6}
// //             placeholder="Type your prayer / thought here...."
// //             style={{
// //               width: '100%',
// //               padding: 12,
// //               borderRadius: 12,
// //               border: '1px solid #ddd',
// //               outline: 'none',
// //               fontSize: 14,
// //               marginBottom: 12,
// //             }}
// //           />
// //           <div>
// //             <button
// //               type="submit"
// //               style={{
// //                 padding: '10px 16px',
// //                 borderRadius: 12,
// //                 border: '1px solid #333',
// //                 background: '#111',
// //                 color: '#fff',
// //                 cursor: 'pointer',
// //               }}
// //             >
// //               Submit
// //             </button>
// //           </div>
// //         </form>
// //       </section>
// //     </main>
// //   )
// // }



// // 
// import { useRef, useState, useEffect } from "react";

// // .env (project root), then restart `npm run dev`:
// // VITE_PRAYER_STREAM_URL=http://localhost:8000/pray
// // VITE_PRAYER_TEXT_URL=http://localhost:8000/pray_text   # optional fallback
// // VITE_PRAYER_API_KEY=dev-secret-key

// // when working with local ollama and fast api
// // const STREAM_URL =
// //   (import.meta.env.VITE_PRAYER_STREAM_URL || "http://localhost:8000/pray").trim();
// // const TEXT_URL =
// //   (import.meta.env.VITE_PRAYER_TEXT_URL || "http://localhost:8000/pray_text").trim();
// // const API_KEY = (import.meta.env.VITE_PRAYER_API_KEY || "").trim();


// //when workign with fast api running on a docker contatiner on google cloud run

// const STREAM_URL = "react-frontend/api/pray_stream.js";
// const TEXT_URL   = "react-frontend/api/pray_text.js";

// export default function PrayerPage() {
//   const [text, setText] = useState("");
//   const [answer, setAnswer] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   const abortRef = useRef(null);
//   const answerBoxRef = useRef(null);

//   // auto-scroll as new content streams in
//   useEffect(() => {
//     if (!answerBoxRef.current) return;
//     answerBoxRef.current.scrollTop = answerBoxRef.current.scrollHeight;
//   }, [answer]);

//   async function handleSubmit(e) {
//     e.preventDefault();
//     setAnswer("");
//     setError("");

//     const prompt = text.trim();
//     if (!prompt) return setError("Please enter a prayer first.");
//     if (!API_KEY)
//       return setError("Missing VITE_PRAYER_API_KEY in .env (restart `npm run dev` after adding).");

//     // cancel any prior stream
//     if (abortRef.current) abortRef.current.abort();
//     const controller = new AbortController();
//     abortRef.current = controller;

//     setLoading(true);
//     try {
//       // 1) try the streaming endpoint (plain text chunks)
//       const res = await fetch(STREAM_URL, {
//         method: "POST",
//       //with old local ollama and fast api
//         //   headers: {
//       //     "Content-Type": "application/json",
//       //     "x-api-key": API_KEY,
//       //     Accept: "text/plain",
//       //   },
//       //   body: JSON.stringify({ prayer: prompt }),
//       //   signal: controller.signal,
//       // });
//       headers: {
//         "Content-Type": "application/json",
//         Accept: "text/plain",
//       },
//       body: JSON.stringify({ prayer: prompt }),
//       signal: controller.signal,
//     });
//       const contentType = res.headers.get("content-type") || "";

//       if (!res.ok) {
//         const raw = await res.text().catch(() => "");
//         // backend sends JSON on some errors (422, 502); try to extract detail
//         try {
//           const j = JSON.parse(raw);
//           throw new Error(j?.detail || j?.error || j?.message || raw || `HTTP ${res.status}`);
//         } catch {
//           throw new Error(raw || `HTTP ${res.status}`);
//         }
//       }

//       // If browser/proxy didn’t give us a stream, fall back to non-stream endpoint
//       if (!res.body || !contentType.includes("text/plain")) {
//         const full = await callPlain(TEXT_URL, prompt, controller.signal);
//         setAnswer(full);
//         return;
//       }

//       // 2) stream chunks and append
//       const reader = res.body.getReader();
//       const decoder = new TextDecoder();
//       let done = false;

//       while (!done) {
//         const { value, done: d } = await reader.read();
//         done = d;
//         if (value) {
//           const chunk = decoder.decode(value, { stream: true });
//           setAnswer((prev) => prev + chunk);
//         }
//       }
//     } catch (err) {
//       if (err?.name === "AbortError") setError("Request canceled.");
//       else setError(err?.message || "Something went wrong.");
//     } finally {
//       setLoading(false);
//       abortRef.current = null;
//     }
//   }

//   async function callPlain(url, prompt, signal) {
//     const res = await fetch(url, {
//       method: "POST",
//     //   headers: {
//     //     "Content-Type": "application/json",
//     //     "x-api-key": API_KEY,
//     //     Accept: "text/plain",
//     //   },
//     //   body: JSON.stringify({ prayer: prompt }),
//     //   signal,
//     // });
//     headers: {
//       "Content-Type": "application/json",
//       Accept: "text/plain",
//     },
//     body: JSON.stringify({ prayer: prompt }),
//     signal: controller.signal,
//   });
//     const raw = await res.text().catch(() => "");
//     if (!res.ok) {
//       try {
//         const j = JSON.parse(raw);
//         throw new Error(j?.detail || j?.error || j?.message || raw || `HTTP ${res.status}`);
//       } catch {
//         throw new Error(raw || `HTTP ${res.status}`);
//       }
//     }
//     return raw;
//   }

//   function handleCancel() {
//     if (abortRef.current) {
//       abortRef.current.abort();
//       abortRef.current = null;
//     }
//   }

//   function handleReset() {
//     setText("");
//     setAnswer("");
//     setError("");
//   }

//   return (
//     <main
//       style={{
//         minHeight: "calc(100vh - 57px)",
//         display: "grid",
//         placeItems: "center",
//         padding: 24,
//       }}
//     >
//       <section style={{ width: "100%", maxWidth: 720 }}>
//         <h2 style={{ fontSize: 24, marginBottom: 12 }}>
//           Lay your thoughts before me, my dear one.
//         </h2>

//         <form onSubmit={handleSubmit}>
//           <label htmlFor="prayer" style={{ display: "block", marginBottom: 8 }} />
//           <textarea
//             id="prayer"
//             value={text}
//             onChange={(e) => setText(e.target.value)}
//             rows={6}
//             placeholder="Type your prayer / thought here...."
//             style={{
//               width: "100%",
//               padding: 12,
//               borderRadius: 12,
//               border: "1px solid #ddd",
//               outline: "none",
//               fontSize: 14,
//               marginBottom: 12,
//             }}
//             disabled={loading}
//           />

//           <div style={{ display: "flex", gap: 8 }}>
//             <button
//               type="submit"
//               disabled={loading}
//               style={{
//                 padding: "10px 16px",
//                 borderRadius: 12,
//                 border: "1px solid #333",
//                 background: "#111",
//                 color: "#fff",
//                 cursor: "pointer",
//                 opacity: loading ? 0.7 : 1,
//               }}
//             >
//               {loading ? "Asking..." : "Communicate"}
//             </button>
//             <button
//               type="button"
//               onClick={handleCancel}
//               disabled={!loading}
//               style={{
//                 padding: "10px 16px",
//                 borderRadius: 12,
//                 border: "1px solid #aaa",
//                 background: "#fff",
//                 color: "#111",
//                 cursor: loading ? "pointer" : "not-allowed",
//                 opacity: loading ? 1 : 0.6,
//               }}
//             >
//               Cancel
//             </button>
//             <button
//               type="button"
//               onClick={handleReset}
//               disabled={loading}
//               style={{
//                 padding: "10px 16px",
//                 borderRadius: 12,
//                 border: "1px solid #ccc",
//                 background: "#fff",
//                 color: "#111",
//                 cursor: "pointer",
//               }}
//             >
//               Reset
//             </button>
//           </div>
//         </form>

//         {/* streaming output */}
//         {(error || answer) && (
//           <div style={{ marginTop: 12 }}>
//             {error && (
//               <div
//                 style={{
//                   marginBottom: 12,
//                   padding: 12,
//                   borderRadius: 10,
//                   border: "1px solid #f4a3a3",
//                   background: "#ffecec",
//                   color: "#a10000",
//                   whiteSpace: "pre-wrap",
//                 }}
//               >
//                 <strong>Error</strong>
//                 <div>{error}</div>
//               </div>
//             )}

//             {answer && (
//               <div
//                 ref={answerBoxRef}
//                 style={{
//                   padding: 12,
//                   borderRadius: 10,
//                   border: "1px solid #bfe8cc",
//                   background: "#ecfff3",
//                   color: "#0b4d2b",
//                   whiteSpace: "pre-wrap",
//                   maxHeight: 320,
//                   overflowY: "auto",
//                   fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
//                   lineHeight: 1.5,
//                 }}
//               >
//                 {answer}
//                 {loading && <span style={{ opacity: 0.6 }}>▌</span>}
//               </div>
//             )}
//           </div>
//         )}
//       </section>
//     </main>
//   );
// }

import { useRef, useState, useEffect } from "react";

const STREAM_URL = "/api/pray_stream";
const TEXT_URL   = "/api/pray_text";

export default function PrayerPage() {
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const abortRef = useRef(null);
  const answerBoxRef = useRef(null);

  // auto-scroll as new content streams in
  useEffect(() => {
    if (!answerBoxRef.current) return;
    answerBoxRef.current.scrollTop = answerBoxRef.current.scrollHeight;
  }, [answer]);

  async function handleSubmit(e) {
    e.preventDefault();
    setAnswer("");
    setError("");

    const prompt = text.trim();
    if (!prompt) {
      setError("Please enter a prayer first.");
      return;
    }

    // cancel any prior stream
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      // try streaming first (expects text/plain chunks)
      const res = await fetch(STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/plain",
        },
        body: JSON.stringify({ prayer: prompt }),
        signal: controller.signal,
      });

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        try {
          const j = JSON.parse(raw);
          throw new Error(j?.detail || j?.error || j?.message || raw || `HTTP ${res.status}`);
        } catch {
          throw new Error(raw || `HTTP ${res.status}`);
        }
      }

      // If not streaming, fall back to plain text endpoint
      if (!res.body || !contentType.includes("text/plain")) {
        const full = await callPlain(TEXT_URL, prompt, controller.signal);
        setAnswer(full);
        return;
      }

      // stream chunks
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setAnswer((prev) => prev + chunk);
        }
      }
    } catch (err) {
      if (err?.name === "AbortError") setError("Request canceled.");
      else setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  async function callPlain(url, prompt, signal) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // proxy now returns text/plain; Accept either is fine
        Accept: "text/plain",
      },
      body: JSON.stringify({ prayer: prompt }),
      signal,
    });

    const raw = await res.text().catch(() => "");
    if (!res.ok) {
      try {
        const j = JSON.parse(raw);
        throw new Error(j?.detail || j?.error || j?.message || raw || `HTTP ${res.status}`);
      } catch {
        throw new Error(raw || `HTTP ${res.status}`);
      }
    }
    return raw; // plain text body
  }

  function handleCancel() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }

  function handleReset() {
    setText("");
    setAnswer("");
    setError("");
  }

  return (
    <main
      style={{
        minHeight: "calc(100vh - 57px)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <section style={{ width: "100%", maxWidth: 720 }}>
        <h2 style={{ fontSize: 24, marginBottom: 12 }}>
          Lay your thoughts before me, my dear one.
        </h2>

        <form onSubmit={handleSubmit}>
          <label htmlFor="prayer" style={{ display: "block", marginBottom: 8 }} />
          <textarea
            id="prayer"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Type your prayer / thought here...."
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              outline: "none",
              fontSize: 14,
              marginBottom: 12,
            }}
            disabled={loading}
          />

        <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: "1px solid #333",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Asking..." : "Communicate"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={!loading}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: "1px solid #aaa",
                background: "#fff",
                color: "#111",
                cursor: loading ? "pointer" : "not-allowed",
                opacity: loading ? 1 : 0.6,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                border: "1px solid #ccc",
                background: "#fff",
                color: "#111",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </form>

        {(error || answer) && (
          <div style={{ marginTop: 12 }}>
            {error && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #f4a3a3",
                  background: "#ffecec",
                  color: "#a10000",
                  whiteSpace: "pre-wrap",
                }}
              >
                <strong>Error</strong>
                <div>{error}</div>
              </div>
            )}

            {answer && (
              <div
                ref={answerBoxRef}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #bfe8cc",
                  background: "#ecfff3",
                  color: "#0b4d2b",
                  whiteSpace: "pre-wrap",
                  maxHeight: 320,
                  overflowY: "auto",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  lineHeight: 1.5,
                }}
              >
                {answer}
                {loading && <span style={{ opacity: 0.6 }}>▌</span>}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}