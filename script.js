const video = document.getElementById('video');
const emotionTextEl = document.getElementById('emotion-text');
const audioEl = document.getElementById('bg-music');
let currentEmotion = 'neutral';
let lastEmotionChange = Date.now();

const EMOTION_CONFIDENCE_THRESHOLD = 0.7;
const EMOTION_MIN_DURATION = 8000; // 8 секунди

const emotionMap = {
  happy: {
    emoji: '😄',
    class: 'happy',
    music: 'music/happy.mp3'
  },
  sad: {
    emoji: '😢',
    class: 'sad',
    music: 'music/sad.mp3'
  },
  neutral: {
    emoji: '😐',
    class: 'neutral',
    music: 'music/neutral.mp3'
  }
};

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
  faceapi.nets.faceExpressionNet.loadFromUri('/models')
]).then(startVideo);

function startVideo() {
  navigator.mediaDevices
    .getUserMedia({ video: {} })
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(err => console.error('Camera error:', err));
}

function updateUI(emotion) {
  const info = emotionMap[emotion] || emotionMap['neutral'];

  // Сменa на текст и емотикон
  emotionTextEl.textContent = `${emotion.charAt(0).toUpperCase() + emotion.slice(1)} ${info.emoji}`;

  // Смена на background класи
  document.body.className = '';
  document.body.classList.add(info.class);

  // Смена на музика
  if (audioEl.src !== location.href + info.music) {
    audioEl.src = info.music;
    audioEl.volume = 0.7;
    audioEl.play();
  }

  // Смена на моменталната емоција
  currentEmotion = emotion;
}

video.addEventListener('play', () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

    if (detections.length > 0) {
      const expressions = detections[0].expressions;
      const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
      const [dominantEmotion, confidence] = sorted[0];

      const now = Date.now();
      if (
        dominantEmotion !== currentEmotion &&
        confidence > EMOTION_CONFIDENCE_THRESHOLD &&
        now - lastEmotionChange > EMOTION_MIN_DURATION
      ) {
        updateUI(dominantEmotion);
        lastEmotionChange = now;
      }
    }
  }, 2000);
});
