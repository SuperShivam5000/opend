import React from "react";
import {Actor,HttpAgent} from "@dfinity/agent"; 
import { idlFactory } from "../../../declarations/nft";
import { idlFactory as tokenIdlFactory } from "../../../declarations/token";
import {Principal} from "@dfinity/principal"; 
import {opend} from "../../../declarations/opend";
import Button from "./Button"; 
import CURRENT_USER_ID from "../index";
import PriceLabel from "./PriceLabel";

function Item(props) { 

  const [name, setName] = React.useState();
  const [owner, setOwner] = React.useState();
  const [image, setImage] = React.useState();
  const [button, setButton] = React.useState();
  const [priceInput, setPriceInput] = React.useState();
  const [loaderHidden, setLoaderHidden] = React.useState(true);
  const [blur, setBlur] = React.useState();
  const [sellStatus, setSellStatus] = React.useState("");
  const [priceLabel, setPriceLabel] = React.useState();
  const [shouldDisplay, setDisplay] = React.useState(true);

  const id = props.id; 
  const localHost = "http://localhost:8080/"; 
  const agent = new HttpAgent({host: localHost});
  agent.fetchRootKey();
  let NFTActor;

  async function loadNFT(){ 
    NFTActor= await Actor.createActor(idlFactory,{
      agent,
      canisterId: id,
    });

    const name = await NFTActor.getName();
    const owner = await NFTActor.getOwner();
    const imageData = await NFTActor.getAsset();
    const imageContent = new Uint8Array(imageData);
    const image = URL.createObjectURL(
      new Blob ([imageContent.buffer],{type: "image/png"})
    );
    setName(name);
    setOwner(owner.toText());
    setImage(image);

    if(props.role=="collection"){ 

    const nftIsListed = await opend.isListed(props.id);
    if(nftIsListed){
      setOwner("OpenD");
      setBlur({filter: "blur(4px)"});
      setSellStatus("Listed");
    }
    else setButton(<Button handleClick = {handleSell} text="Sell"/> );
  } else if(props.role=="discover"){
    const originalOwner = await opend.getOriginalOwner(props.id);
    if(originalOwner.toText() != CURRENT_USER_ID.toText()){
      setButton(<Button handleClick = {handleBuy} text="Buy"/> );
    }

    const price = await opend.getListedNFTPrice(props.id);
    setPriceLabel(<PriceLabel sellPrice={price.toString()} />);
  }
}

  React.useEffect(function(){
    loadNFT();
  }, []);
  
  let price;
  function handleSell() {
    console.log("sell click");
    setPriceInput(<input
      placeholder="Price in DANG"
      type="number"
      className="price-input"
      value={price}
      onChange={(e)=>(price=e.target.value)}
    />);
    setButton(<Button handleClick = {sellItem} text="Confirm"/> ); 
  }
  
  async function sellItem(){ 
    setBlur({filter: "blur(4px)"});
    setLoaderHidden(false);
    console.log("confirm clicked");
    const listingResult = await opend.listItem(props.id, Number(price));
    console.log("listing: " + listingResult);
    if(listingResult == "Success"){
      const openDId = await opend.getOpenDCanisterID();
      const transferResult =  await NFTActor.transferOwnership(openDId, true);
      console.log("transfer: " + transferResult);
      if(transferResult == "Success") {
        setLoaderHidden(true);
        setButton();
        setPriceInput();
        setOwner("OpenD");
        setSellStatus("Listed");
      }
    }
  }
  async function handleBuy() {
    console.log("Buy was triggered");
    setLoaderHidden(false);
    const tokenActor = await Actor.createActor(tokenIdlFactory, {
      agent,
      canisterId: Principal.fromText("wqmuk-5qaaa-aaaaa-aaaqq-cai"),
    });

    const sellerId = await opend.getOriginalOwner(props.id);
    const itemPrice = await opend.getListedNFTPrice(props.id);

    const result = await tokenActor.transfer(sellerId, itemPrice);
    if (result == "Success") {
      const transferResult = await opend.completePurchase(
        props.id,
        sellerId,
        CURRENT_USER_ID
      );
      console.log("purchase: " + transferResult);
      setLoaderHidden(true);
      setDisplay(false);
    }
  }

  return (
    <div style={{display: shouldDisplay?"inline" : "none"}} className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image} style={blur}
        />
        <div className="lds-ellipsis" hidden={loaderHidden}>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
        <div className="disCardContent-root">
          {priceLabel}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}<span className="purple-text"> {sellStatus}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner: {owner}
          </p>
          {priceInput} 
          {button} 
        </div>
      </div>
    </div>
  );
}

export default Item;
