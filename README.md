# DailyTask Monitor - تطبيق إدارة مهام يومية مع نظام مراقب

تطبيق Android متكامل لإدارة المهام اليومية مع نظام مراقبة صارم ولوحة ملاحظات تفاعلية.

## المميزات الرئيسية

### 1. نظام الحسابات
- حساب مستخدم رئيسي
- حساب مراقب (Supervisor)
- ربط الحسابات عبر QR Code

### 2. نظام الإنذار الصارم
- إنذار صوتي عالي لا يتوقف إلا بتأكيد المستخدم والمراقب
- يعمل في الخلفية حتى عند قفل الشاشة
- لا يتأثر بوضع توفير الطاقة

### 3. لوحة الملاحظات التفاعلية
- شبكة من الملاحظات اللاصقة القابلة للسحب والإفلات
- 6 ألوان مختلفة للملاحظات
- قوائم مهام مصغرة داخل الملاحظات
- ربط الملاحظات بالمهام

### 4. نظام المراقبة
- إشعارات فورية للمراقب عند إنجاز المهام
- نظام تأكيد مزدوج (مستخدم + مراقب)
- سجل كامل لجميع المهام

## المتطلبات

- Node.js 16+
- npm أو yarn
- Expo CLI
- حساب Firebase
- Android Studio (للبناء المحلي)

## خطوات التثبيت

### 1. تثبيت الأدوات المطلوبة

```bash
# تثبيت Expo CLI عالمياً
npm install -g expo-cli

# تثبيت EAS CLI للبناء
npm install -g eas-cli
```

### 2. تجهيز المشروع

```bash
# استنساخ المشروع
cd DailyTaskMonitor

# تثبيت الحزم
npm install

# أو باستخدام yarn
yarn install
```

### 3. إعداد Firebase

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. أنشئ مشروع جديد
3. أضف تطبيق Android جديد
4. حمل ملف `google-services.json`
5. أنشئ قاعدة بيانات Realtime Database
6. أنشئ Authentication للبريد الإلكتروني
7. فعّل Cloud Messaging

### 4. تحديث ملفات التكوين

#### ملف `config/firebase.js`

```javascript
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
```

#### ملف `firebase.json`

قم بتحديث نفس القيم أعلاه.

### 5. إعدادات الأذونات

أضف الأذونات التالية في ملف `app.json`:

```json
"permissions": [
  "android.permission.SCHEDULE_EXACT_ALARM",
  "android.permission.USE_EXACT_ALARM",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.VIBRATE",
  "android.permission.WAKE_LOCK",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.CAMERA",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE"
]
```

### 6. تشغيل التطبيق للتطوير

```bash
# تشغيل على محاكي Android
expo start --android

# أو باستخدام Expo Go على الهاتف
expo start
```

### 7. بناء ملف APK

```bash
# تسجيل الدخول إلى EAS
eas login

# بناء APK للاختبار
eas build -p android --profile preview

# أو بناء ملف AAB للمتجر
eas build -p android --profile production
```

## هيكل المشروع

```
DailyTaskMonitor/
├── screens/
│   ├── LoginScreen.js              # شاشة تسجيل الدخول
│   ├── UserDashboardScreen.js      # لوحة المستخدم الرئيسية
│   ├── SupervisorDashboardScreen.js # لوحة المراقب
│   ├── NotesBoardScreen.js         # لوحة الملاحظات التفاعلية
│   └── FullScreenAlarmScreen.js    # شاشة الإنذار الكاملة
├── config/
│   └── firebase.js                 # تكوين Firebase
├── assets/                         # الصور والملفات الثابتة
├── App.js                          # المكون الرئيسي
├── app.json                        # إعدادات Expo
├── eas.json                        # إعدادات البناء
├── package.json                    # حزم Node.js
└── README.md                       # هذا الملف
```

## استخدام التطبيق

### للمستخدمين

1. **إنشاء حساب**: سجل حساب جديد كمستخدم
2. **إضافة مهام**: أضف مهامك اليومية مع الأوقات
3. **إعداد وقت اليوم**: حدد وقت بداية اليوم (مثلاً 6 صباحاً)
4. **استخدام الملاحظات**: استخدم لوحة الملاحظات للملاحظات السريعة
5. **تنفيذ المهام**: عند تنبيه المهمة، اضغط "تم التنفيذ"

### للمراقبين

1. **إنشاء حساب**: سجل حساب جديد كمراقب
2. **مسح QR Code**: امسح كود QR الخاص بالمستخدم
3. **متابعة المهام**: شاهد مهام المستخدمين المربوطين
4. **تأكيد المهام": أكد أو ارفض إنجاز المهام

## ميزات لوحة الملاحظات

### إنشاء ملاحظات
- المس زر + لإنشاء ملاحظة جديدة
- اختر اللون المناسب
- أضف علامات (tags) للتنظيم

### قائمة المهام المصغرة
- أضف قائمة مهام داخل الملاحظة
- علم على المهام المنتهية
- تتبع التقدم بسهولة

### ربط المهام
- اربط الملاحظة بمهمة محددة
- ظهور إشعارات للملاحظات المرتبطة
- وصول سريع للمهمة من الملاحظة

### التنظيم
- سحب وإفلات الملاحظات
- تغيير الأحجام
- تغيير الألوان
- البحث في الملاحظات

## قاعدة البيانات

### هيكل Firebase Realtime Database

```json
{
  "users": {
    "userId": {
      "email": "user@example.com",
      "startTime": "06:00",
      "tasks": {
        "taskId": {
          "title": "اسم المهمة",
          "time": "14:30",
          "status": "pending|done|confirmed",
          "priority": "high|medium|low",
          "description": "وصف المهمة",
          "createdAt": "timestamp",
          "doneAt": "timestamp",
          "confirmedAt": "timestamp"
        }
      },
      "notesBoard": {
        "layout": "freeform|grid",
        "background": "color|image",
        "notes": {
          "noteId": {
            "content": "نص الملاحظة",
            "color": "#FFEB3B",
            "position": { "x": 100, "y": 200 },
            "size": { "width": 200, "height": 150 },
            "zIndex": 1,
            "createdAt": "timestamp",
            "updatedAt": "timestamp",
            "tags": ["مهم", "فكرة"],
            "checklist": [
              { "text": "عنصر 1", "checked": false },
              { "text": "عنصر 2", "checked": true }
            ],
            "linkedTaskId": "taskId_optional",
            "isArchived": false
          }
        }
      }
    }
  },
  "supervisors": {
    "supervisorId": {
      "email": "supervisor@example.com",
      "linkedUsers": {
        "userId": {
          "linkedAt": "timestamp"
        }
      }
    }
  }
}
```

## الأذونات المطلوبة

- **SCHEDULE_EXACT_ALARM**: لجدولة الإنذارات بدقة
- **POST_NOTIFICATIONS**: لإرسال الإشعارات
- **FOREGROUND_SERVICE**: للعمل في الخلفية
- **VIBRATE**: للاهتزاز عند التنبيه
- **CAMERA**: لمسح QR Code
- **READ/WRITE_EXTERNAL_STORAGE**: لحفظ الملاحظات والصور

## حل المشاكل

### مشكلة: الإنذار لا يعمل في الخلفية
الحل: فعّل "Allow background activity" في إعدادات التطبيق

### مشكلة: الإشعارات لا تظهر
الحل: تأكد من منح إذن الإشعارات في إعدادات النظام

### مشكلة: QR Code لا يعمل
الحل: تأكد من منح إذن الكاميرا واستخدام كاميرا عالية الجودة

### مشكلة: الملاحظات لا تتحرك
الحل: تأكد من تفعيل "Allow display over other apps"

## التوافق

- Android 6.0+ (API 23+)
- Android 12 و 13 و 14 مدعومة
- يعمل على الهواتف والأجهزة اللوحية

## الأمان

- تشفير البيانات في Firebase
- مصادقة آمنة عبر البريد الإلكتروني
- أذونات محددة لكل مستخدم

## التحديثات المستقبلية

- دعم اللغات المتعددة
- مزامنة مع Google Calendar
- إحصائيات متقدمة
- وضع مظلم
- تصدير البيانات

## الدعم

للدعم الفني أو الإبلاغ عن مشاكل، يرجى التواصل عبر:
- البريد الإلكتروني: support@dailytaskmonitor.com

## الترخيص

هذا المشروع مفتوح المصدر ويمكن استخدامه وتعديله حسب الحاجة.

---

**ملاحظة**: تأكد من تعديل جميع القيم في ملفات التكوين قبل البناء. يجب استبدال `YOUR_API_KEY` و `YOUR_PROJECT_ID` وغيرها بالقيم الفعلية من Firebase Console.