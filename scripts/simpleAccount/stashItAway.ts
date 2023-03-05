import { ethers } from "ethers";
import {
  getVerifyingPaymaster,
  getSimpleAccount,
  getGasFee,
  printOp,
  getHttpRpcClient,
  STASH_VAULT_ABI,
} from "../../src";
// @ts-ignore
import config from "../../config.json";

export default async function main(
  amt: string,
  withPM: boolean
) {
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const paymasterAPI = withPM
    ? getVerifyingPaymaster(config.paymasterUrl, config.entryPoint)
    : undefined;
  const accountAPI = getSimpleAccount(
    provider,
    config.signingKey,
    config.entryPoint,
    config.simpleAccountFactory,
    paymasterAPI
  );

  const stashVault = new ethers.Contract("0x9E0e37D1ccc47ff31A6ff2cC10f61770c13b853d", STASH_VAULT_ABI, provider);
  const value = ethers.utils.parseEther(amt);
  console.log(`Stashing away ${amt} ethers...`);

  const op = await accountAPI.createSignedUserOp({
    target: stashVault.address,
    data: stashVault.interface.encodeFunctionData("stashItAway", []),
    ...(await getGasFee(provider)), value
  });
  console.log(`Signed UserOperation: ${await printOp(op)}`);

  const client = await getHttpRpcClient(
    provider,
    config.bundlerUrl,
    config.entryPoint
  );
  const uoHash = await client.sendUserOpToBundler(op);
  console.log(`UserOpHash: ${uoHash}`);

  console.log("Waiting for transaction...");
  const txHash = await accountAPI.getUserOpReceipt(uoHash);
  console.log(`Transaction hash: ${txHash}`);
}
