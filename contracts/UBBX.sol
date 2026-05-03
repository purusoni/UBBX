// SPDX-License-Identifier: MIT
// UBBX — UB Book Exchange. On-chain: listings, Yoda payment, events.
// Heavy metadata (title, contact, images) lives off-chain; optional bytes32 anchors JSON integrity.

pragma solidity ^0.8.28;

/// @dev IERC20 surface required for Yoda payments (OpenZeppelin-compatible signatures).
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount)
        external
        returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender)
        external
        view
        returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

contract UBBX {
    IERC20 public immutable yoda;
    address public administrator;

    enum Condition {
        Acceptable,
        Good,
        Very_Good,
        Like_New
    }
    enum Availability {
        Available,
        Pending,
        Sold
    }

    struct Listing {
        uint256 isbn;
        uint256 priceYoda;
        Condition bookCondition;
        Availability bookAvailability;
        address seller;
        bytes32 metadataHash;
    }

    uint256 public listingId;

    mapping(uint256 => Listing) public listings;
    mapping(address => uint256[]) public sellerListings;

    event BookListed(
        uint256 indexed listingId,
        address indexed seller,
        uint256 isbn,
        uint256 priceYoda,
        Condition condition,
        bytes32 metadataHash
    );
    event BookPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 priceYoda
    );

    constructor(address yodaToken) {
        administrator = msg.sender;
        yoda = IERC20(yodaToken);
    }

    /// @param priceYoda Amount in Yoda smallest units (wei), same as ERC-20 decimals.
    /// @param metadataHash keccak256 of canonical off-chain JSON bytes, or bytes32(0) to skip on-chain anchor.
    function listBook(
        uint256 isbn,
        uint256 priceYoda,
        Condition condition,
        bytes32 metadataHash
    ) external {
        require(priceYoda > 0, "UBBX: price");
        listingId++;
        listings[listingId] = Listing({
            isbn: isbn,
            priceYoda: priceYoda,
            bookCondition: condition,
            bookAvailability: Availability.Available,
            seller: msg.sender,
            metadataHash: metadataHash
        });
        sellerListings[msg.sender].push(listingId);
        emit BookListed(
            listingId,
            msg.sender,
            isbn,
            priceYoda,
            condition,
            metadataHash
        );
    }

    /// @notice Buyer must have approved this contract for at least listing.priceYoda before calling.
    function purchaseBook(uint256 id) external {
        Listing storage L = listings[id];
        require(L.seller != address(0), "UBBX: no listing");
        require(L.bookAvailability == Availability.Available, "UBBX: not available");
        require(msg.sender != L.seller, "UBBX: seller");

        uint256 price = L.priceYoda;
        require(
            yoda.transferFrom(msg.sender, L.seller, price),
            "UBBX: transferFrom"
        );

        L.bookAvailability = Availability.Sold;
        emit BookPurchased(id, msg.sender, L.seller, price);
    }

    function showBook(uint256 id) external view returns (Listing memory) {
        return listings[id];
    }

    function showListingId() external view returns (uint256) {
        return listingId;
    }
}
