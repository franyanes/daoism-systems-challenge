// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "hardhat/console.sol";

/**
 * @title Ballot contract.
 * @dev   Smart contract for creating, voting and executing adds and subs on a counter.
 */
contract Ballot {
   /*
        State variables
    */

    ERC721 public customNFT;        // NTF token.
    int256 public counter;          // Counter to be affected by proposals.
    Proposal[] public proposals;    // Array containing all the created proposals.
    mapping(uint256 => mapping(address => bool)) voters;    // Track of voters: proposalId => voter => hasVoted

    /*
        Structs
    */
    
    struct Proposal {
        bool hasEnded;          // State of the proposal.
        bool isAddProposal;     // Type of proposal (add or sub).
        uint256 voteCount;      // Current amount of votes issued.
        uint256 minimumVotes;   // Amount of votes required for the proposal campaign to end (needs >50% to be executed).
        int256 votingResult;    // Sum of all positive and negative votes.
    }

    /*
        Events
    */

    event Creation(
        uint256 indexed id,
        address indexed creator,
        bool isAddProposal
    );
    event Vote(
        uint256 indexed id,
        address voter,
        bool vote
    );
    event Finalize(
        uint256 indexed id,
        bool isAddProposal,
        bool executed
    );

    /*
        Constructor
    */

    constructor(ERC721 _customNFT) {
        customNFT = _customNFT;
    }

    /*
        Modifiers
    */

    modifier nftOwner {
        require(customNFT.balanceOf(msg.sender) > 0, "ERC721: sender does not own an NFT");
        _;
    }

    /*
        Creating, voting and executing of proposals.
    */

    /**
     * @dev                     Creates a proposal to be voted.
     * @param _isAddProposal    Type of the proposal (add or sub).
     * @param _minimumVotes     Amount of votes required to end the proposal.
     */
    function createProposal(bool _isAddProposal, uint256 _minimumVotes) public nftOwner {
        require(_minimumVotes > 0, "Ballot: minimum votes should be greater than 0");

        Proposal memory newProposal = Proposal({
            hasEnded: false,
            isAddProposal: _isAddProposal,
            voteCount: 0,
            minimumVotes: _minimumVotes,
            votingResult: 0
        });
        uint256 id = proposals.length;
        proposals.push(newProposal);
        emit Creation(id, msg.sender, _isAddProposal);
    }

    /**
     * @dev                     Lets users vote on an existing proposal, and also ends and executes it if conditions are met.
     * @param _proposalId       Index of the proposal in the array.
     * @param _voteInFavor      Positive or negative vote on the proposal.
     */
    function voteProposal(uint256 _proposalId, bool _voteInFavor) public nftOwner {
        require(_proposalId < proposals.length, "Ballot: proposal ID is nonexistant");
        require(voters[_proposalId][msg.sender] == false, "Ballot: user has already voted on this proposal");

        Proposal memory proposal = proposals[_proposalId];
        require(proposal.hasEnded == false, "Ballot: proposal has already been executed"); // change message

        if (_voteInFavor == true) {
            proposal.votingResult++;
        } else {
            proposal.votingResult--;
        }
        proposal.voteCount++;
        if (proposal.voteCount >= proposal.minimumVotes) {
            if (proposal.votingResult > 0) {
                _executeProposal(proposal.isAddProposal);
                emit Finalize(_proposalId, proposal.isAddProposal, true);
            } else {
                emit Finalize(_proposalId, proposal.isAddProposal, false);
            }
            proposal.hasEnded = true;
        }
        proposals[_proposalId] = proposal;
        voters[_proposalId][msg.sender] = true;
        emit Vote(_proposalId, msg.sender, _voteInFavor);
    }

    /**
     * @dev                     Adds/subs 1 to/from the counter depending on the proposal type.
     * @param _isAddProposal    Type of the proposal.
     */
    function _executeProposal(bool _isAddProposal) internal {
        if (_isAddProposal) {
            counter++;
        } else {
            counter--;
        }
    }
}
