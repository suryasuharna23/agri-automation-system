import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

export default function FloatingCameraBtn() {
  const navigation = useNavigation<any>();

  return (
    <LinearGradient
      style={styles.wrap}
      locations={[0, 1]}
      colors={['#0e4719', '#062f0e']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <TouchableOpacity onPress={() => navigation.navigate('Camera')} activeOpacity={0.8}>
        <LinearGradient
          style={styles.btn}
          locations={[0, 0.42]}
          colors={['#a69e84', '#fbf2d4']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          <Image
            style={styles.icon}
            resizeMode="cover"
            source={require('../../assets/icons/icon-camera.png')}
          />
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 52,
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    paddingLeft: 9,
    paddingTop: 6,
    paddingRight: 10,
    paddingBottom: 7,
  },
  btn: {
    width: 66,
    height: 53,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 40,
    height: 40,
  },
});
