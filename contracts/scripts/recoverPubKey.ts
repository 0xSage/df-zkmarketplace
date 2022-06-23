import Common from '@ethereumjs/common';
import { FeeMarketEIP1559Transaction } from '@ethereumjs/tx';
import { Address, toChecksumAddress } from 'ethereumjs-util';
import { ethers } from 'ethers';
import * as hre from 'hardhat';

async function main () {
    const privateKeyHolder = hre.config.networks.hardhat.accounts[ 0 ].privateKey;
    const privateSigningKey = new hre.ethers.utils.SigningKey(privateKeyHolder);

    const address = "0xfC5632d904f2B40A9D2E215E55bAd747b1F776C6";
    const nmFactory = await hre.ethers.getContractFactory("NightMarket");
    const nm = nmFactory.attach("0x6792e95058514c51aB07533B0bE4B3ADB6FFa1d8");
    const [ ask ] = await nm.queryFilter(nm.filters.Asked(address, 12));
    const tx = await ask.getTransaction();
    // delete tx.gasPrice
    const txData = {
        gasLimit: tx.gasLimit,
        value: tx.value,
        nonce: tx.nonce,
        data: tx.data,
        chainId: tx.chainId,
        to: tx.to!,
        type: 2,
        maxFeePerGas: tx.maxFeePerGas!,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas!,
    };
    const rsTx = await ethers.utils.resolveProperties(txData)
    const raw = ethers.utils.serializeTransaction(rsTx)
    const msgHash = ethers.utils.keccak256(raw) // as specified by ECDSA
    const msgBytes = ethers.utils.arrayify(msgHash)
    const signature = ethers.utils.joinSignature({r: tx.r!, s: tx.s!, v: tx.v!})
    const pubkey = hre.ethers.utils.recoverPublicKey(msgBytes, signature);
    const computedAddress = hre.ethers.utils.computeAddress(pubkey);


    console.log({
        initialAddress: address,
        pubKey: pubkey,
        computedAddress
    });

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });