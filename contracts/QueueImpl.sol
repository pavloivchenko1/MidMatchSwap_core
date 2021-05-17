// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;
import "./libraries/Customer.sol";

contract CustomerQueue {
    mapping(address => Customer.Info) queueAddress;
    address firstAddress;
    address lastAddress;
    uint24 public numberOfPeopleInQueue;

    function enqueue(Customer.Info memory data)
        external
        returns (address queuePosition)
    {
        if (firstAddress == address(0)) {
            firstAddress = msg.sender;
            lastAddress = msg.sender;
        } else {
            queueAddress[lastAddress].next = msg.sender;
            data.prev = lastAddress;
            lastAddress = msg.sender;
        }
        numberOfPeopleInQueue++;
        queueAddress[msg.sender] = data;
        return lastAddress;
    }

    function dequeue()
        external
        returns (Customer.Info memory data, address nextAddress)
    {
        require(firstAddress != address(0)); // non-empty queue
        data = queueAddress[firstAddress];
        delete queueAddress[firstAddress];
        firstAddress = data.next;
        numberOfPeopleInQueue--;
        return (data, firstAddress);
    }

    function deleteFirst() external {
        require(firstAddress != address(0));
        address newFirstAddress = queueAddress[firstAddress].next;
        delete queueAddress[firstAddress];
        firstAddress = newFirstAddress;
        delete queueAddress[firstAddress].prev;
        numberOfPeopleInQueue--;
    }

    function deleteFromQueue(address owner)
        external
        returns (Customer.Info memory data)
    {
        data = queueAddress[owner];
        queueAddress[data.prev].next = data.next;
        delete queueAddress[owner];
    }

    function getFirst()
        external
        view
        returns (Customer.Info memory data, address index)
    {
        require(firstAddress != address(0), "EMPTY QUEUE");
        return (queueAddress[firstAddress], firstAddress);
    }

    function updateBalance(address owner, uint256 amount) public {
        queueAddress[owner].amount = amount;
    }
}
