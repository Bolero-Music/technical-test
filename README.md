# Bolero Technical Test Review

## Overview

This repository serves the purpose of transferring shares (ERC721 NFTs) from a vault managed by Bolero to user wallets. The Bolero architecture comprises a Ruby on Rails monolith handling business logic and serving as the API, an Express.js service interacting with the blockchain, and a Next.js frontend communicating with the Rails API.

## Context

On Bolero, users can purchase shares using cryptocurrencies or cards via Stripe. If a user pays by card without having a wallet, the shares are transferred to a vault until they create and connect a wallet to Bolero. Once a wallet is connected, the shares held in the vault are attempted to be transferred to the newly connected wallet. This repository implements this transfer feature.

## Expectations

Your task is to understand the transfer process implemented in this repository. Explicitly explain your approach to reading the repository, ask questions as needed, and share your thoughts on the codebase as you explore it. While you're not expected to grasp every detail of every function, we're interested in hearing your thought process and insights on how you would improve various aspects.
