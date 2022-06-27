import { FunctionalComponent, h } from "preact";
import { useState } from "preact/hooks";
import { useListings } from "../hooks/use-listings";
import { ListingHeaderRow, ListingRow } from "../components/ListingItem";
import { OrdersListView } from "./OrdersListView";
import { Listing } from "../typings/typings";
import { OrderPlacerView } from "./OrderPlacerView";

export const MarketView: FunctionalComponent = () => {
	const listings = useListings();
	const [ placeOrderView, setPlaceOrderView ] = useState<Listing>();
	const [ listOrdersView, setListOrdersView ] = useState<Listing>();

	if (placeOrderView) {
		// View a single order for order placement (from market view)
		return (
			<OrderPlacerView listing={placeOrderView} />
		);
	}

	if (listOrdersView) {
		// View a list of orders (from market or mylistings view)
		return (
			<OrdersListView listing={listOrdersView} />
		);
	}

	// View all listings (market view)
	return (
		<div style={{ display: "grid", gridRowGap: "4px" }}>
			<ListingHeaderRow />
			{
				listings.map((listing) => (
					<ListingRow orderview={setPlaceOrderView} listordersview={setListOrdersView} view={'market'} listing={listing} />
				)
				)
			}
		</div>
	);
};