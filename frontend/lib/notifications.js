// Browser Notification Helper Functions

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const showNotification = (title, options = {}) => {
  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      ...options
    });

    // Auto close after 10 seconds
    setTimeout(() => notification.close(), 10000);

    return notification;
  }
};

export const notifyNewEmergency = (report) => {
  const typeEmoji = {
    fire: "🔥",
    medical: "🏥",
    crime: "🚔"
  };

  const title = `${typeEmoji[report.type]} New ${report.type.toUpperCase()} Emergency!`;
  
  const options = {
    body: `Location: ${report.latitude?.toFixed(4)}°, ${report.longitude?.toFixed(4)}°\nStatus: ${report.status}`,
    tag: report.id,
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };

  // Play notification sound
  playNotificationSound();

  return showNotification(title, options);
};

export const playNotificationSound = () => {
  // Create a simple beep sound using Web Audio API
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.log("Could not play sound:", e);
  }
};
