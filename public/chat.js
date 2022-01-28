const socket = io();

const divVideoChatLobby = document.getElementById('video-chat-lobby');
const divVideoChat = document.getElementById('video-chat-room');
const joinButton = document.getElementById('join');
const userVideo = document.getElementById('user-video');
const peerVideo = document.getElementById('peer-video');
const roomInput = document.getElementById('roomName');

let isCreator = false;
let RTC;
let userStream;

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.l.google.com:19302' },
  ],
};

const triggerCandidate = (event) => {
  if (event.candidate) {
    socket.emit('candidate', event.candidate, roomInput.value);
  }
};

const triggerPeerVideo = (event) => {
  peerVideo.srcObject = event.streams[0];
  peerVideo.onloadedmetadata = () => {
    peerVideo.play();
  };
};

const initMedia = (isJoinedEvent) => {
  navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 1280, height: 720 } })
  .then((stream) => {
      userStream = stream;
      divVideoChatLobby.style = 'display: none';

      userVideo.srcObject = stream;
      userVideo.onloadedmetadata = () => {
        userVideo.play();
      };

      if (isJoinedEvent) {
        socket.emit('ready', roomInput.value);
      }
  })
  .catch((error) => {
    alert("Couldn't access user media.");
  });
};

joinButton.addEventListener('click', () => {
  if (!roomInput.value) {
    return alert("Please enter a room name.");
  }
  socket.emit('join', roomInput.value);
});

socket.on('created', () => {
  isCreator = true;
  initMedia();
});

socket.on('joined', () => {
  isCreator = false;
  initMedia(true);
});

socket.on('full', () => {
  alert('Room is full.');
});

socket.on('ready', () => {
  if (isCreator) {
    const audioStream = userStream.getTracks()[0];
    const videoStream = userStream.getTracks()[1];

    RTC = new RTCPeerConnection(iceServers);
    RTC.onicecandidate = triggerCandidate;
    RTC.ontrack = triggerPeerVideo;
    RTC.addTrack(audioStream, userStream);
    RTC.addTrack(videoStream, userStream);

    RTC.createOffer()
      .then((offer) => {
        RTC.setLocalDescription(offer);
        socket.emit('offer', offer, roomInput.value);
      })
      .catch((error) => { 
        console.log(error);
      });
  }
});

socket.on('candidate', (candidate) => {
  const iceCandidate = new RTCIceCandidate(candidate);
  RTC.addIceCandidate(iceCandidate);
});

socket.on('offer', (offer) => {
  if (!isCreator) {
    const audioStream = userStream.getTracks()[0];
    const videoStream = userStream.getTracks()[1];

    RTC = new RTCPeerConnection(iceServers);
    RTC.onicecandidate = triggerCandidate;
    RTC.ontrack = triggerPeerVideo;
    RTC.addTrack(audioStream, userStream);
    RTC.addTrack(videoStream, userStream);
    RTC.setRemoteDescription(offer);
    RTC.createAnswer((answer) => {
      RTC.setLocalDescription(answer);
      socket.emit('answer', answer, roomInput.value);
    }, 
    (error) => { 
      console.log(error);
    });
  }
});

socket.on('answer', (answer) => {
  RTC.setRemoteDescription(answer);
});
