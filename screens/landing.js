import React, {useState, useContext} from "react";
import { StyleSheet, Text, View, Button, Alert, ActivityIndicator, Platform } from "react-native";
import { HeaderButtons, Item } from 'react-navigation-header-buttons';
import MyHeaderButton from './MyHeaderButton';
import { Image } from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Permissions from 'expo-permissions';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

import { GlobalContext } from "../GlobalContext";

const Landing = props => {

	const [textOCR, setTextOCR] = useState();
	const [plate, setPlate, isLoading, setIsLoading, isError, setIsError] = useContext(GlobalContext);

	const allowCam = async () => {
		const result = await Permissions.askAsync(Permissions.CAMERA)

		if (result.status !== 'granted') {
			Alert.alert('Permission nécessaire', 'Votre permission est nécessaire pour utiliser l\'appareil photo', [{ text: 'Compris' }]);
			return false;
		}

		return true;
	};

	const allowLoc = async () => {
		const result = await Permissions.askAsync(Permissions.LOCATION)

		if (result.status !== 'granted') {
			Alert.alert('Permission localisation nécessaire', 'Votre permission est nécessaire afin d\'aider les services concernés à localiser le véhicule scané', [{ text: 'Compris' }]);
			return false;
		}

		return true;
	};

	const launchCam = async () => {
		const allowedCam = await allowCam();
		const allowedLoc = await allowLoc();
		if (!allowedCam || !allowedLoc ) {
			return;
		}
		const image = await ImagePicker.launchCameraAsync();
		const imageFormat = await ImageManipulator.manipulateAsync(image.uri, [{ resize: {width:1000} }], {compress: 1});
		const imageName = imageFormat.uri.split('/').pop();
		const imagePath = FileSystem.documentDirectory + imageName;

		await FileSystem.moveAsync({
			from: imageFormat.uri,
			to: imagePath
		})

		let timestamp = (Date.now() / 1000 | 0).toString();
		let api_key = '335175835411183'
		let api_secret = 'WbphncPPGQmZ1UR2oSWDC2kyRYo'
		let cloud = 'amircloud'
		let hash_string = 'timestamp=' + timestamp + api_secret
		let digest = await Crypto.digestStringAsync(
			Crypto.CryptoDigestAlgorithm.SHA1, hash_string
		)
		let signature = digest.toString()
		let upload_url = 'https://api.cloudinary.com/v1_1/' + cloud + '/image/upload'

	  
		let xhr = new XMLHttpRequest();
		xhr.open('POST', upload_url);

		xhr.onload = () => {

			var myHeaders = new Headers();
			myHeaders.append("apikey", "739498b88588957"); 
			myHeaders.append('Accept', 'image / jpg');
	
			var formdata = new FormData();
			formdata.append("language", "fre");
			formdata.append("isOverlayRequired", "false");
			formdata.append("filetype", "jpg");
			formdata.append("url", JSON.parse(xhr.response).url);
			formdata.append("iscreatesearchablepdf", "false");
			formdata.append("issearchablepdfhidetextlayer", "false");
			formdata.append("OCREngine", "2");
	
			var requestOptions = {
			method: 'POST',
			headers: myHeaders,
			body: formdata,
			redirect: 'follow'
			};

			fetch("https://api.ocr.space/parse/image", requestOptions)
				.then(response => response.text())
				.then( async result =>  {
					const location = await Location.getCurrentPositionAsync();
					fetch('https://a-mir-pi.herokuapp.com/plates', {
						method: 'post',
						headers: {
							'Accept': 'application/json, text/plain, */*',
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							num: JSON.parse(result).ParsedResults[0].ParsedText,
							long: location.coords['latitude'],
							lat: location.coords['longitude']
						})
					});
					setPlate(JSON.parse(result).ParsedResults[0].ParsedText);
					setIsLoading(false);
				})
				.catch(error => console.log('error', error));
				
		};
		
		let formData = new FormData();
		formData.append('file', {uri: imagePath, type: 'image/png', name: 'upload.png'});
		formData.append('timestamp', timestamp);
		formData.append('api_key', api_key);
		formData.append('signature', signature);
		xhr.send(formData);
		
		const screen = await props.navigation.navigate('LastPlateScreen');
	};

	return (
		<View style={styles.container}>
			
			<View style={styles.tileCam}>
				<Image source={require('../assets/camera.png')} style={{width: 100,height: 100}} />
				<Button title="Plaque" color="#e2e5ec" onPress={launchCam} />
			</View>
			
			<View style={styles.tileSearch}>
				<Image source={require('../assets/search.png')} style={{width: 100,height: 100}} />
				<Button title="Rechercher" color="#e2e5ec"  onPress={() => props.navigation.navigate('SearchScreen')} />
			</View>
		</View>
	);
}

Landing.navigationOptions = navData => {
	return {
	  headerLeft: (
		<HeaderButtons HeaderButtonComponent={MyHeaderButton}>
		  <Item
			title="Menu"
			iconName="ios-menu"
			onPress={() => {
			  navData.navigation.toggleDrawer();
			}}
		  />
		</HeaderButtons>
	  )
	};
  };

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#e2e5ec",
		justifyContent: "space-around",
		alignItems: "center"
	}
});

export default Landing