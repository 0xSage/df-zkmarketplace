import { h, FunctionalComponent } from "preact";
import { useConnection } from "../hooks/use-connection";
import { ethers, Transaction } from "ethers";
import { useContract } from "../hooks/use-contract";
import { useRecoverPubKey } from "../hooks/use-recoverpubkey";
import { useSharedKeyCommitment } from "../hooks/use-ecdh";
import { useAskTx } from "../hooks/use-asktx";
import { TextInput } from "../components/Input";
import { passwordToKey } from "../helpers/utils";
import { OrderItem } from "./MyOrdersView";
import { useEffect, useState } from "preact/hooks";
import { Button } from "../components/Button";
import { ManageOrderItemProps, OrdersViewProps } from "../typings/typings";
import { orderStyles } from "../helpers/theme";
import { useMarket } from "../hooks/use-market";

export const ManageOrderItem: FunctionalComponent<ManageOrderItemProps> = (props) => {

	const { market } = useContract();
	const [ confirm, setConfirm ] = useState(false);
	const [ key, setKey ] = useState([] as string[]);
	const [ password, setPassword ] = useState("");
    const { sale } = useMarket();
	const privateKey = (useConnection()).getPrivateKey();
	const currentAddress = ethers.utils.getAddress(useConnection().getAddress()); // checksum needed
	const sellerSigningKey = new ethers.utils.SigningKey(privateKey);
	const askTx = useAskTx(market, props.order!.buyer, props.listing.listingId);
	const { pubKey: buyerPublicKey } = useRecoverPubKey(askTx as Transaction);
	const { sharedKeyCommitment, sharedKey } = useSharedKeyCommitment(sellerSigningKey, buyerPublicKey);

	const acceptButtonActive = (props.order!.isActive && currentAddress == props.listing.seller && props.listing.isActive);

	useEffect(() => {
		setKey(passwordToKey(password));
	}, [ password ]);

	if (confirm) {
		return (
			<div style={orderStyles.order}>
				{[
					<TextInput name="password" type="string" value={password} placeholder={"your password"} onChange={setPassword} />,
					<Button children={('confirm')} style={{ width: "100%" }} onClick={async () => await sale(props.listing.listingId, props.order!.orderId, key, sharedKey, props.listing.nonce!, props.listing.keyCommitment, sharedKeyCommitment)} />,
					<Button children={('cancel')} style={{ width: "100%" }} onClick={() => setConfirm(false)} />
				]}
			</div>
		);
	}

	return (
		<OrderItem order={props.order!} action={() => setConfirm(true)} childrenAction={'accept'} buttonDisabled={!acceptButtonActive} />
	);
};

export const OrdersListView: FunctionalComponent<OrdersViewProps> = (props) => {
	return (
		<div>
			<div>Orders for listing {props.listing.listingId}</div>
			<div>Seller: {props.listing.seller}</div>
			<div style={{ display: "grid", rowGap: "4px" }}>
				{props.listing.orders?.map((order) => <ManageOrderItem listing={props.listing} order={order} />)}
			</div>
		</div>
	);
};
