// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title GrainTransfer
 * @author B.Tech Final Year Project Team
 * @notice Records grain transfers from the Admin storage to Dealers.
 * @dev All state modifications are restricted to the Admin (contract deployer).
 */
contract GrainTransfer {
    // The administrator's address who has authorization to transfer grain
    address public admin;

    // Struct representing a single grain transfer record
    struct Transfer {
        uint256 transferId;
        address dealerAddress;
        uint256 quantity;
        uint256 timestamp;
    }

    // Auto-incrementing identifier for transfers
    uint256 private _nextTransferId = 1;
    
    // Mapping from transferId to Transfer record
    mapping(uint256 => Transfer) private _transfers;
    
    // List of all transfer IDs for enumeration
    uint256[] private _transferIds;

    // Event emitted when a new grain transfer is recorded on the blockchain
    event GrainTransferred(
        uint256 indexed transferId,
        address indexed dealerAddress,
        uint256 quantity,
        uint256 timestamp
    );

    // Modifier to restrict functions to only the administrator
    modifier onlyAdmin() {
        require(msg.sender == admin, "GrainTransfer: Only admin can perform this action");
        _;
    }

    /**
     * @notice Constructor sets the deployer as the admin.
     */
    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Records a grain transfer from the Admin to a Dealer.
     * @param dealer The wallet address of the dealer.
     * @param quantity The quantity of grains transferred.
     */
    function transferGrain(address dealer, uint256 quantity) external onlyAdmin {
        require(dealer != address(0), "GrainTransfer: Invalid dealer address");
        require(quantity > 0, "GrainTransfer: Quantity must be greater than zero");

        uint256 transferId = _nextTransferId;
        _transfers[transferId] = Transfer({
            transferId: transferId,
            dealerAddress: dealer,
            quantity: quantity,
            timestamp: block.timestamp
        });
        
        _transferIds.push(transferId);
        _nextTransferId++;

        emit GrainTransferred(transferId, dealer, quantity, block.timestamp);
    }

    /**
     * @notice Fetches details of a specific grain transfer record.
     * @param transferId The ID of the transfer record to retrieve.
     * @return id The ID of the transfer.
     * @return dealerAddress The address of the dealer.
     * @return quantity The quantity of grain.
     * @return timestamp The time at which transfer was recorded.
     */
    function getTransfer(uint256 transferId) external view returns (
        uint256 id,
        address dealerAddress,
        uint256 quantity,
        uint256 timestamp
    ) {
        Transfer memory t = _transfers[transferId];
        require(t.transferId != 0, "GrainTransfer: Transfer record does not exist");
        return (t.transferId, t.dealerAddress, t.quantity, t.timestamp);
    }

    /**
     * @notice Retrieves all grain transfers recorded in the contract.
     * @return An array of Transfer structs.
     */
    function getAllTransfers() external view returns (Transfer[] memory) {
        Transfer[] memory allTransfers = new Transfer[](_transferIds.length);
        for (uint256 i = 0; i < _transferIds.length; i++) {
            allTransfers[i] = _transfers[_transferIds[i]];
        }
        return allTransfers;
    }
}
