// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

string constant TOKEN_NAME = "CustomNFT";
string constant TOKEN_SYMBOL = "CNFT";



contract CustomNFT is ERC721(TOKEN_NAME, TOKEN_SYMBOL) {
    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }
}
