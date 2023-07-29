const express = require('express')
const multer = require('multer')
const cors = require('cors');
const axios = require('axios')
const app = express()
const port = process.env.PORT || 5000

app.use(express.json())

const upload = multer({
    limits: {
        fileSize: 1000000
    }
})

const starton = axios.create({
    baseURL: "https://api.starton.io/v3",
    headers: {
        "x-api-key": "sk_live_55b1712e-cee9-4b9d-b75f-9782da1ffd71",
    },
})

app.post('/upload', cors(), upload.single('file'), async (req, res) => {

    let data = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    data.append("file", blob, { filename: req.file.originalnam })
    data.append("isSync", "true");

    async function uploadImageOnIpfs() {
        const ipfsImg = await starton.post("/ipfs/file", data, {
            headers: { "Content-Type": `multipart/form-data; boundary=${data._boundary}` },
        })
        return ipfsImg.data;
    }
    async function uploadMetadataOnIpfs(imgCid) {
        const metadataJson = {
            name: `A Wonderful NFT`,
            description: `Probably the most awesome NFT ever created !`,
            image: `ipfs://ipfs/${imgCid}`,
        }
        const ipfsMetadata = await starton.post("/ipfs/json", {
            name: "My NFT metadata Json",
            content: metadataJson,
            isSync: true,
        })
        return ipfsMetadata.data;
    }

    const SMART_CONTRACT_NETWORK = "polygon-mumbai"
    const SMART_CONTRACT_ADDRESS = "0xd42CD5ac847eBb5f555f7BC281Add29ADc69e22C"
    const WALLET_IMPORTED_ON_STARTON = "0x19d5a361F6fD1d77130601Fab8F4ad304909F463";
    async function mintNFT(receiverAddress, metadataCid) {
        const nft = await starton.post(`/smart-contract/${SMART_CONTRACT_NETWORK}/${SMART_CONTRACT_ADDRESS}/call`, {
            functionName: "mint",
            signerWallet: WALLET_IMPORTED_ON_STARTON,
            speed: "low",
            params: [receiverAddress, metadataCid],
        })
        return nft.data;
    }
    const RECEIVER_ADDRESS = "0x19d5a361F6fD1d77130601Fab8F4ad304909F463"
    const ipfsImgData = await uploadImageOnIpfs();
    const ipfsMetadata = await uploadMetadataOnIpfs(ipfsImgData.cid);
    const nft = await mintNFT(RECEIVER_ADDRESS, ipfsMetadata.cid)
    console.log(nft)
    res.status(201).json({
        transactionHash: nft.transactionHash,
        cid: ipfsImgData.cid
    })
})
app.listen(port, () => {
    console.log('Server is running on port ' + port);
})