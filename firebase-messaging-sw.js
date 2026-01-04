// Firebase Cloud Messaging Service Worker
// This file should be placed in the public folder for web deployment

importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message: ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png',
    sound: 'default',
    vibrate: [200, 100, 200],
    data: payload.data,
    actions: [
      {
        action: 'confirm',
        title: 'تأكيد',
      },
      {
        action: 'snooze',
        title: 'تأجيل',
      },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked: ', event);

  event.notification.close();

  if (event.action === 'confirm') {
    // Handle confirmation action
    console.log('Task confirmed');
  } else if (event.action === 'snooze') {
    // Handle snooze action
    console.log('Task snoozed');
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle push events
self.addEventListener('push', (event) => {
  console.log('Push event received: ', event);

  const options = {
    body: 'لديك مهمة جديدة',
    icon: '/firebase-logo.png',
    badge: '/firebase-logo.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2',
    },
    actions: [
      {
        action: 'explore',
        title: 'عرض المهمة',
        icon: '/firebase-logo.png',
      },
      {
        action: 'close',
        title: 'إغلاق',
        icon: '/firebase-logo.png',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification('DailyTask Monitor', options)
  );
});