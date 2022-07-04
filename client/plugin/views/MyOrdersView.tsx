import { Transaction } from "ethers";
import { FunctionalComponent, h } from "preact";
import { useState } from "preact/hooks";
import { Button } from "../components/Button";
import { } from "../components/MyListingsContext";
import { getListingsWithOrdersFromAddress } from "../helpers/transactions";
import { useContract } from "../hooks/use-contract";
import { useListings } from "../hooks/use-listings";
import { useSigner } from "../hooks/use-signer";
import { Listing, Order, OrderItemProps, ActiveSigner } from "../typings/typings";
import { listingStyles, orderStyles } from "../helpers/theme";


export const OrderItem: FunctionalComponent<OrderItemProps> = (props: OrderItemProps) => {
	const [ confirmAction, setconfirmAction ] = useState(false);
	const buttonTheme = confirmAction ? "green" : "default";
	const children = confirmAction ? "confirm" : props.childrenAction;
	return (
		<div style={orderStyles.order}>
			{[
				<div style={listingStyles.longText}> {props.order.buyer} </div>,
				<div style={listingStyles.longText}> {props.order.created.toString()} </div>,
				<div style={listingStyles.longText}> {props.order.expectedSharedKeyHash.toString()} </div>,
				<div style={listingStyles.longText}> {props.order.isActive.toString()} </div>,
				<Button theme={buttonTheme} disabled={props.buttonDisabled} children={(children)}
					style={{ width: "100%" }} onClick={async () => await (confirmAction ? props.action() : setconfirmAction(true))} />,
			]}
		</div>
	);
};

export function MyOrdersView () {
	const signer = useSigner() as ActiveSigner;
	const { listings } = useListings();
	const { market } = useContract();
	const [ myOrders, setMyOrders ] = useState<{ orders: Order[], listing: Listing; }[]>(getListingsWithOrdersFromAddress(listings, signer.address));
	const refund = async (listing: Listing, order: Order): Promise<Transaction> => {
		const tx = await market.refund(listing.listingId, order.orderId);
		console.log("refund tx: ", tx);
		return tx;
	};

	return (
		<div>
			My orders at address {signer.address}
			<div style={{ display: "grid", rowGap: "4px" }}>
				{myOrders.map((listing) => (
					<div style={{ display: "grid", rowGap: "4px" }}>
						{listing.orders.map((order) => (
							<OrderItem order={order} action={async () => await refund(listing.listing, order)} childrenAction={'refund'} buttonDisabled={!order.isActive} />
						)
						)}
					</div>
				)
				)
				}
			</div>
		</div>
	);
}