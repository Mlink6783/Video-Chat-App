const socket = io();
let localStream;
let peerConnection;
let currentPartnerId = null;

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

document.getElementById("startBtn").onclick = startChat;
document.getElementById("nextBtn").onclick = nextChat;

async function startChat() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
  socket.emit("joinQueue");
}

function nextChat() {
  if (peerConnection) peerConnection.close();
  remoteVideo.srcObject = null;
  peerConnection = null;
  socket.emit("joinQueue");
}

socket.on("matchFound", async (partnerId) => {
  currentPartnerId = partnerId;
  setupConnection(partnerId, true);
});

socket.on("signal", async ({ from, data }) => {
  if (!peerConnection) setupConnection(from, false);

  if (data.type === "offer") {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("signal", { to: from, data: peerConnection.localDescription });
  } else if (data.type === "answer") {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
  } else if (data.candidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  }
});

function setupConnection(partnerId, isInitiator) {
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("signal", { to: partnerId, data: event.candidate });
    }
  };

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  if (isInitiator) {
    peerConnection.onnegotiationneeded = async () => {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit("signal", { to: partnerId, data: offer });
    };
  }
}
