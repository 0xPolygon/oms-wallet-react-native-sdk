import { OMSWallet } from '@polygonlabs/oms-wallet-react-native';
import { registerRootComponent } from 'expo';
import { Text } from 'react-native';

// Build fixture only: the key is a syntactically valid placeholder.
export const omsWallet = new OMSWallet({
  publishableKey: 'pk_dev_sdbx_00000000000000_00000000000000000000000000',
});

function App() {
  return <Text>OMS Wallet Expo minimum fixture</Text>;
}

registerRootComponent(App);
