// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title BeneficiaryManagement
 * @author B.Tech Final Year Project Team
 * @notice Manages beneficiary entitlements, registration, and monthly collection status.
 * @dev Emits events to ensure transparency and prevent double-collection.
 */
contract BeneficiaryManagement {
    // The administrator's address who can register/update beneficiaries
    address public admin;

    // Struct representing a single beneficiary's record
    struct Beneficiary {
        uint256 beneficiaryId;
        address walletAddress;
        uint256 monthlyEntitlement;
        bool hasCollected;
        bool isRegistered;
    }

    // Auto-incrementing identifier for beneficiaries
    uint256 private _nextBeneficiaryId = 1;
    
    // Mapping from beneficiary wallet address to Beneficiary record
    mapping(address => Beneficiary) private _beneficiaries;
    
    // Mapping from beneficiary ID to beneficiary wallet address
    mapping(uint256 => address) private _idToAddress;

    // Array keeping track of all registered wallet addresses for iteration
    address[] private _registeredAddresses;

    // Event emitted when a new beneficiary is registered
    event BeneficiaryRegistered(
        uint256 indexed beneficiaryId,
        address indexed walletAddress,
        uint256 monthlyEntitlement
    );

    // Event emitted when a beneficiary's monthly entitlement is updated
    event EntitlementUpdated(
        address indexed walletAddress,
        uint256 newEntitlement
    );

    // Event emitted when a beneficiary successfully collects their monthly ration
    event RationCollected(
        address indexed walletAddress,
        uint256 quantity,
        uint256 timestamp
    );

    // Event emitted when the monthly collection statuses are reset for a new month
    event StatusReset();

    // Modifier to restrict functions to the administrator
    modifier onlyAdmin() {
        require(msg.sender == admin, "BeneficiaryManagement: Only admin can perform this action");
        _;
    }

    /**
     * @notice Constructor sets the deployer as the admin.
     */
    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Registers a new beneficiary into the PDS.
     * @param walletAddress The wallet address of the beneficiary.
     * @param monthlyEntitlement The monthly entitlement of grains in kilograms.
     */
    function registerBeneficiary(address walletAddress, uint256 monthlyEntitlement) external onlyAdmin {
        require(walletAddress != address(0), "BeneficiaryManagement: Invalid wallet address");
        require(monthlyEntitlement > 0, "BeneficiaryManagement: Entitlement must be greater than zero");
        require(!_beneficiaries[walletAddress].isRegistered, "BeneficiaryManagement: Beneficiary already registered");

        uint256 beneficiaryId = _nextBeneficiaryId;
        
        _beneficiaries[walletAddress] = Beneficiary({
            beneficiaryId: beneficiaryId,
            walletAddress: walletAddress,
            monthlyEntitlement: monthlyEntitlement,
            hasCollected: false,
            isRegistered: true
        });

        _idToAddress[beneficiaryId] = walletAddress;
        _registeredAddresses.push(walletAddress);
        _nextBeneficiaryId++;

        emit BeneficiaryRegistered(beneficiaryId, walletAddress, monthlyEntitlement);
    }

    /**
     * @notice Updates the monthly entitlement of an existing beneficiary.
     * @param walletAddress The wallet address of the beneficiary.
     * @param newEntitlement The new entitlement quantity in kilograms.
     */
    function updateEntitlement(address walletAddress, uint256 newEntitlement) external onlyAdmin {
        require(_beneficiaries[walletAddress].isRegistered, "BeneficiaryManagement: Beneficiary not registered");
        require(newEntitlement > 0, "BeneficiaryManagement: Entitlement must be greater than zero");

        _beneficiaries[walletAddress].monthlyEntitlement = newEntitlement;

        emit EntitlementUpdated(walletAddress, newEntitlement);
    }

    /**
     * @notice Registers that a beneficiary has collected their monthly ration.
     * @dev Prevents double-collection of ration. Can be called by authorized dealers or admin.
     * @param walletAddress The wallet address of the beneficiary.
     * @param quantity The quantity of ration being collected (must match or be less than entitlement).
     */
    function collectRation(address walletAddress, uint256 quantity) external {
        // Validation check for beneficiary registration
        require(_beneficiaries[walletAddress].isRegistered, "BeneficiaryManagement: Beneficiary not registered");
        // Prevent double collection
        require(!_beneficiaries[walletAddress].hasCollected, "BeneficiaryManagement: Ration already collected for this month");
        // Verify quantity is valid and doesn't exceed entitlement
        require(quantity > 0, "BeneficiaryManagement: Quantity must be greater than zero");
        require(quantity <= _beneficiaries[walletAddress].monthlyEntitlement, "BeneficiaryManagement: Quantity exceeds monthly entitlement");

        _beneficiaries[walletAddress].hasCollected = true;

        emit RationCollected(walletAddress, quantity, block.timestamp);
    }

    /**
     * @notice Resets the collection status (hasCollected) of all registered beneficiaries.
     * @dev Admin can trigger this monthly to allow beneficiaries to collect for the new cycle.
     */
    function resetMonthlyCollection() external onlyAdmin {
        for (uint256 i = 0; i < _registeredAddresses.length; i++) {
            _beneficiaries[_registeredAddresses[i]].hasCollected = false;
        }
        emit StatusReset();
    }

    /**
     * @notice Gets the registered beneficiary information.
     * @param walletAddress The wallet address of the beneficiary.
     * @return beneficiaryId The ID of the beneficiary.
     * @return wallet The wallet address.
     * @return monthlyEntitlement The monthly entitlement amount.
     * @return hasCollected Whether the beneficiary has collected ration this month.
     * @return isRegistered Whether the beneficiary is registered.
     */
    function getBeneficiary(address walletAddress) external view returns (
        uint256 beneficiaryId,
        address wallet,
        uint256 monthlyEntitlement,
        bool hasCollected,
        bool isRegistered
    ) {
        Beneficiary memory b = _beneficiaries[walletAddress];
        require(b.isRegistered, "BeneficiaryManagement: Beneficiary not registered");
        return (b.beneficiaryId, b.walletAddress, b.monthlyEntitlement, b.hasCollected, b.isRegistered);
    }
}
