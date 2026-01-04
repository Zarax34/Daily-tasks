import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView
} from 'react-native';
import { Card, Button, Title, Paragraph } from 'react-native-paper';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set, push } from 'firebase/database';
import firebaseConfig from '../config/firebase';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('user'); // 'user' or 'supervisor'
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async () => {
    try {
      let userCredential;
      
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create user profile in database
        const userId = userCredential.user.uid;
        const userRef = ref(database, `${userType}s/${userId}`);
        
        await set(userRef, {
          email: email,
          userType: userType,
          createdAt: new Date().toISOString(),
          userId: userId
        });

        // If it's a user, create a QR code data
        if (userType === 'user') {
          const qrRef = ref(database, `users/${userId}/qrData`);
          await set(qrRef, {
            userId: userId,
            email: email,
            createdAt: new Date().toISOString()
          });
        }
      }

      const user = userCredential.user;
      
      // Navigate based on user type
      if (userType === 'user') {
        navigation.navigate('UserDashboard', { userId: user.uid });
      } else {
        navigation.navigate('SupervisorDashboard', { supervisorId: user.uid });
      }
      
    } catch (error) {
      Alert.alert('خطأ', error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        {/* <Image
          source={require('../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        /> */}
        <Title style={styles.title}>DailyTask Monitor</Title>
        <Paragraph style={styles.subtitle}>إدارة مهام يومية مع نظام مراقب</Paragraph>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </Title>

          <View style={styles.userTypeSelector}>
            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === 'user' && styles.selectedUserType
              ]}
              onPress={() => setUserType('user')}
            >
              <Text style={[
                styles.userTypeText,
                userType === 'user' && styles.selectedUserTypeText
              ]}>
                مستخدم
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === 'supervisor' && styles.selectedUserType
              ]}
              onPress={() => setUserType('supervisor')}
            >
              <Text style={[
                styles.userTypeText,
                userType === 'supervisor' && styles.selectedUserTypeText
              ]}>
                مراقب
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="البريد الإلكتروني"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="كلمة المرور"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            mode="contained"
            onPress={handleAuth}
            style={styles.button}
            labelStyle={styles.buttonText}
          >
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}
          </Button>

          <TouchableOpacity
            onPress={() => setIsLogin(!isLogin)}
            style={styles.switchButton}
          >
            <Text style={styles.switchText}>
              {isLogin 
                ? 'ليس لديك حساب؟ إنشاء حساب جديد'
                : 'لديك حساب بالفعل؟ تسجيل الدخول'
              }
            </Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          التطبيق يدعم نظام الملاحظات اللاصقة التفاعلية
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    borderRadius: 15,
    elevation: 5,
    marginBottom: 20,
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 20,
  },
  userTypeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectedUserType: {
    backgroundColor: '#2196F3',
  },
  userTypeText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  selectedUserTypeText: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
  },
  button: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#2196F3',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  switchText: {
    color: '#2196F3',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default LoginScreen;