import axios from 'axios';
import { BigNumber, ethers } from 'ethers';
import { CleanEnvType } from '../dotenv';

export const getGasStationURI = (env: CleanEnvType) => {
  const isProduction = env.NODE_ENV === 'production';
  return isProduction
    ? 'https://gasstation.polygon.technology/v2'
    : 'https://gasstation-testnet.polygon.technology/v2';
};

const number2DigitsToBigNumberGwei = (data: number) => {
  return ethers.utils.parseUnits(`${Math.ceil(data)}`, 'gwei');
};

export const calculateGasPrice = async (env: CleanEnvType, gasEstimated: BigNumber) => {
  const uri = getGasStationURI(env);

  const gas = {
    gasLimit: gasEstimated,
    maxFeePerGas: ethers.BigNumber.from(40000000000),
    maxPriorityFeePerGas: ethers.BigNumber.from(40000000000),
  };
  try {
    const { data } = await axios({
      method: 'get',
      url: uri,
    });
    const percentToAdd = env.GAS_PERCENT_TO_ADD;
    let maxFeePerGas = number2DigitsToBigNumberGwei(data.fast.maxFee);

    const valueToAdd = maxFeePerGas.mul(percentToAdd).div(100);
    maxFeePerGas = maxFeePerGas.add(valueToAdd);

    gas.maxFeePerGas = maxFeePerGas;
    gas.maxPriorityFeePerGas = number2DigitsToBigNumberGwei(data.fast.maxPriorityFee);
    return gas;
  } catch (error) {
    console.error('Error in calculateGasPrice:', { error });
    return gas;
  }
};
