// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ReceiptManager
 * @author B.Tech Final Year Project Team
 * @notice Generates immutable blockchain receipts for ration distributions.
 * @dev Emits events for public verification and implements role-based access for receipt creation.
 */
contract ReceiptManager {
    // The administrator's address who can authorize dealers/generators
    address public admin;

    // Struct representing a single receipt record
    struct Receipt {
        uint256 receiptId;
        uint256 beneficiaryId;
        uint256 quantity;
        string transactionReference; // e.g., Hash of the database transaction or receipt data
        uint256 timestamp;
    }

    // Auto-incrementing identifier for receipts
    uint256 private _nextReceiptId = 1;
    
    // Mapping from receiptId to Receipt record
    mapping(uint256 => Receipt) private _receipts;
    
    // List of all receipt IDs for global tracking
    uint256[] private _receiptIds;

    // Mapping of authorized addresses allowed to generate receipts (e.g. Dealer wallets)
    mapping(address => bool) public authorizedGenerators;

    // Event emitted when a receipt is generated
    event ReceiptGenerated(
        uint256 indexed receiptId,
        uint256 indexed beneficiaryId,
        uint256 quantity,
        string transactionReference,
        uint256 timestamp
    );

    // Modifier to restrict functions to the administrator
    modifier onlyAdmin() {
        require(msg.sender == admin, "ReceiptManager: Only admin can perform this action");
        _;
    }

    // Modifier to restrict functions to authorized generators (like Dealers or backend)
    modifier onlyAuthorized() {
        require(
            msg.sender == admin || authorizedGenerators[msg.sender],
            "ReceiptManager: Caller is not authorized to generate receipts"
        );
        _;
    }

    /**
     * @notice Constructor sets the deployer as admin and authorizes them to generate receipts.
     */
    constructor() {
        admin = msg.sender;
        authorizedGenerators[msg.sender] = true;
    }

    /**
     * @notice Authorizes a dealer or backend service to generate receipts.
     * @param generator The address of the generator.
     */
    function authorizeGenerator(address generator) external onlyAdmin {
        require(generator != address(0), "ReceiptManager: Invalid generator address");
        authorizedGenerators[generator] = true;
    }

    /**
     * @notice Revokes receipt generation authorization from a dealer/service.
     * @param generator The address of the generator.
     */
    function revokeGenerator(address generator) external onlyAdmin {
        require(generator != address(0), "ReceiptManager: Invalid generator address");
        authorizedGenerators[generator] = false;
    }

    /**
     * @notice Generates a receipt after ration collection.
     * @param beneficiaryId The ID of the beneficiary collecting ration.
     * @param quantity The quantity of ration distributed.
     * @param transactionReference A reference hash or ID from the off-chain system (MongoDB ID, IPFS hash).
     * @return The ID of the generated receipt.
     */
    function generateReceipt(
        uint256 beneficiaryId,
        uint256 quantity,
        string calldata transactionReference
    ) external onlyAuthorized returns (uint256) {
        require(beneficiaryId > 0, "ReceiptManager: Invalid beneficiary ID");
        require(quantity > 0, "ReceiptManager: Quantity must be greater than zero");
        require(bytes(transactionReference).length > 0, "ReceiptManager: Reference cannot be empty");

        uint256 receiptId = _nextReceiptId;

        _receipts[receiptId] = Receipt({
            receiptId: receiptId,
            beneficiaryId: beneficiaryId,
            quantity: quantity,
            transactionReference: transactionReference,
            timestamp: block.timestamp
        });

        _receiptIds.push(receiptId);
        _nextReceiptId++;

        emit ReceiptGenerated(receiptId, beneficiaryId, quantity, transactionReference, block.timestamp);

        return receiptId;
    }

    /**
     * @notice Retrieves details of a specific receipt.
     * @param receiptId The ID of the receipt.
     * @return id The ID of the receipt.
     * @return beneficiaryId The ID of the beneficiary.
     * @return quantity The quantity of ration.
     * @return transactionReference The off-chain reference.
     * @return timestamp The time at which receipt was generated.
     */
    function getReceipt(uint256 receiptId) external view returns (
        uint256 id,
        uint256 beneficiaryId,
        uint256 quantity,
        string memory transactionReference,
        uint256 timestamp
    ) {
        Receipt memory r = _receipts[receiptId];
        require(r.receiptId != 0, "ReceiptManager: Receipt does not exist");
        return (r.receiptId, r.beneficiaryId, r.quantity, r.transactionReference, r.timestamp);
    }

    /**
     * @notice Retrieves all receipts stored on-chain.
     * @return An array of Receipt structs.
     */
    function getAllReceipts() external view returns (Receipt[] memory) {
        Receipt[] memory allReceipts = new Receipt[](_receiptIds.length);
        for (uint256 i = 0; i < _receiptIds.length; i++) {
            allReceipts[i] = _receipts[_receiptIds[i]];
        }
        return allReceipts;
    }
}
