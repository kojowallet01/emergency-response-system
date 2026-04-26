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

  // Play different sound based on emergency type
  playNotificationSound(report.type);

  return showNotification(title, options);
};

export const playNotificationSound = (emergencyType = 'fire') => {
  // Different sounds for different emergency types
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies and patterns for each type
    const soundConfig = {
      fire: {
        frequency: 880, // High pitch - urgent
        type: "square",
        duration: 0.6,
        pattern: [0.2, 0.1, 0.2] // Fast beeps
      },
      medical: {
        frequency: 660, // Medium pitch - alert
        type: "sine",
        duration: 0.8,
        pattern: [0.3, 0.15, 0.3] // Steady beeps
      },
      crime: {
        frequency: 440, // Lower pitch - serious
        type: "sawtooth",
        duration: 1.0,
        pattern: [0.4, 0.2, 0.4] // Slower beeps
      }
    };

    const config = soundConfig[emergencyType] || soundConfig.fire;

    oscillator.frequency.value = config.frequency;
    oscillator.type = config.type;

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + config.duration);

    // Play second beep for emphasis
    setTimeout(() => {
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      
      oscillator2.frequency.value = config.frequency * 1.2;
      oscillator2.type = config.type;
      
      gainNode2.gain.setValueAtTime(0.25, audioContext.currentTime);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator2.start(audioContext.currentTime);
      oscillator2.stop(audioContext.currentTime + 0.3);
    }, 200);

  } catch (e) {
    console.log("Could not play sound:", e);
  }
};
