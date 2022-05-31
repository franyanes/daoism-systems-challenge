const { expect } = require("chai");
const { ethers } = require("hardhat");

let CustomNFT, Ballot;
let customNFT, ballot;
let alice, bob, charlie, chuck, dave;

describe("Proposal Creation", () => {
    before(async () => {
        await  _setTestingEnvironment();
    });
 
    it("non-NTF owners cannot create or vote proposals", async () => {
        try {
            await ballot.connect(chuck).createProposal(true, 0);
            expect.fail("Function above should have thrown an error");
        } catch (err) {
            expect(_errorContainsString(err, "ERC721: sender does not own an NFT")).to.equals(true);
        }
    });

    it("NFT owners can create proposals", async () => {
        try {
            await ballot.connect(alice).createProposal(true, 3);
        } catch (err) {
            expect.fail();
        }
    });

    it("proposals variables are set up correctly upon creation", async () => {
        let proposal = await ballot.proposals(0);
        expect(proposal["hasEnded"] == false);
        expect(proposal["isAddProposal"] == true);
        expect(proposal["voteCount"] == 0);
        expect(proposal["minimumVotes"] == 3);
        expect(proposal["hasEnded"] == false);
    });

    it("require that created proposals must have a minimum votes number greather than zero", async () => {
        try {
            await ballot.connect(alice).createProposal(true, 0);
            expect.fail("Function above should have thrown an error");
        } catch (err) {
            expect(_errorContainsString(err, "Ballot: minimum votes should be greater than 0")).to.equals(true);
        }
    });

    it("should emit Creation event", async () => {
        const isAddProposal = true;
        const minimumVotes = 3;
        await expect(ballot.connect(alice).createProposal(isAddProposal, minimumVotes)).
            to.emit(ballot, 'Creation')
            .withArgs(1, alice.address, isAddProposal);
    });
});

describe("Proposal Voting", function () {
    before(async () => {
        await _setTestingEnvironment();
        await ballot.connect(alice).createProposal(true, 3);
    });

    it("non-NTF owners cannot vote on proposals", async () => {
        try {
            await ballot.connect(chuck).voteProposal(0, true);
            expect.fail("Function above should have thrown an error");
        } catch (err) {
            expect(_errorContainsString(err, "ERC721: sender does not own an NFT")).to.equals(true);
        }
    });

    it("require that the proposal ID matches an existing proposal", async () => {
        try {
            await ballot.connect(alice).voteProposal(1, true);
            expect.fail("Function above should have thrown an error");
        } catch (err) {
            expect(_errorContainsString(err, "Ballot: proposal ID is nonexistant")).to.equals(true);
        }
        try {
            await ballot.connect(alice).voteProposal(0, true);
        } catch (err) {
            expect.fail(err);
        }
    });

    it("require that voter has not already voted on the proposal", async () => {
        try {
            await ballot.connect(alice).voteProposal(0, true);
            expect.fail("Function above should have thrown an error");
        } catch (err) {
            expect(_errorContainsString(err, "Ballot: user has already voted on this proposal")).to.equals(true);
        }  
    });

    it("should emit Vote event", async () => {
        const proposalId = 0;
        const voteInFavor = true;
        await expect(ballot.connect(bob).voteProposal(proposalId, voteInFavor)).
            to.emit(ballot, 'Vote')
            .withArgs(proposalId, bob.address, voteInFavor);
    });

    it("proposal is executed after reaching minimum votes count", async () => {
        //await ballot.connect(bob).voteProposal(0, true);
        await ballot.connect(charlie).voteProposal(0, true);
        let proposal = await ballot.proposals(0);
        expect(proposal["hasEnded"]).to.equals(true);
    });

    it("require that proposal has not been executed before voting", async () => {
        try {
            await ballot.connect(dave).voteProposal(0, true);
            expect.fail("Function above should have thrown an error");
        } catch (err) {
            expect(_errorContainsString(err, "Ballot: proposal has already been executed")).to.equals(true);
        }  
    });

    it("hasEnded proposal successfully affected the count", async () => {
        expect(Number(await ballot.counter())).to.equals(1);
    });

    it("should emit Finalize event", async () => {
        const isAddProposal = true;
        const trx = await ballot.connect(alice).createProposal(isAddProposal, 1);
        const proposalId = await _getProposalIdFromTrx(trx);
        const voteInFavor = false;
        await expect(ballot.connect(alice).voteProposal(proposalId, voteInFavor)).
            to.emit(ballot, 'Finalize')
            .withArgs(proposalId, isAddProposal, false); 
    });
});

describe("End-to-end Testing", () => {
    before(async () => {
        await _setTestingEnvironment();
    });

    it("a proposal to add 1 to the counter is created and voted by the mayority", async () => {
        const counterInitialValue = Number(await ballot.counter());
        const trx = await ballot.connect(alice).createProposal(true, 3);
        proposalId = await _getProposalIdFromTrx(trx);
        await ballot.connect(alice).voteProposal(proposalId, true);
        await ballot.connect(bob).voteProposal(proposalId, true);
        await ballot.connect(charlie).voteProposal(proposalId, true);
        expect(Number(await ballot.counter())).to.equals(counterInitialValue + 1);
    });

    it("a proposal to sub 1 from the counter is created and voted by the mayority", async () => {
        const counterInitialValue = Number(await ballot.counter());
        const trx = await ballot.connect(alice).createProposal(false, 3);
        proposalId = await _getProposalIdFromTrx(trx);
        await ballot.connect(alice).voteProposal(proposalId, true);
        await ballot.connect(bob).voteProposal(proposalId, true);
        await ballot.connect(charlie).voteProposal(proposalId, true);
        expect(Number(await ballot.counter())).to.equals(counterInitialValue - 1);
    });

    it("a proposal with 50/50 voting results is not executed", async () => {
        const counterInitialValue = Number(await ballot.counter());
        const trx = await ballot.connect(alice).createProposal(true, 4);
        proposalId = await _getProposalIdFromTrx(trx);
        await ballot.connect(alice).voteProposal(proposalId, true);
        await ballot.connect(bob).voteProposal(proposalId, true);
        await ballot.connect(charlie).voteProposal(proposalId, false);
        await ballot.connect(dave).voteProposal(proposalId, false);
        expect(Number(await ballot.counter())).to.equals(counterInitialValue);
    });
});

async function _setTestingEnvironment() {
    CustomNFT = await ethers.getContractFactory("CustomNFT");
    Ballot = await ethers.getContractFactory("Ballot");
    customNFT = await CustomNFT.deploy();
    ballot = await Ballot.deploy(customNFT.address);
    [alice, bob, charlie, chuck, dave] = await ethers.getSigners();
    await customNFT.mint(alice.address, 0);
    await customNFT.mint(bob.address, 1);
    await customNFT.mint(charlie.address, 2);
    await customNFT.mint(dave.address, 3);
}

function _errorContainsString(err, string) {
    if (err == undefined || string == undefined) expect.fail("_errorContainsString function error");
    return err.toString().search(string) > 0;
}

async function _getProposalIdFromTrx(_trx) {
    const receipt = await _trx.wait();
    return receipt.events[0].args.id;
}