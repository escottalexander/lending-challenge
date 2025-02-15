import { useEffect, useState } from "react";
import { Address, createWalletClient, http, parseEther } from "viem";
import { hardhat } from "viem/chains";
import { ArrowDownIcon, ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { Balance, IntegerInput } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract, useTransactor } from "~~/hooks/scaffold-eth";
import { tokenName } from "~~/utils/constant";

const localWalletClient = createWalletClient({
  chain: hardhat,
  transport: http(),
});
const FAUCET_ACCOUNT_INDEX = 0;

type TokenSwapModalProps = {
  tokenBalance: string;
  connectedAddress: string;
  ETHprice: string;
  modalId: string;
};

export const TokenSwapModal = ({ tokenBalance, connectedAddress, ETHprice, modalId }: TokenSwapModalProps) => {
  const burnAddress = "0x000000000000000000000000000000000000dead";

  const faucetTxn = useTransactor(localWalletClient);
  const writeTx = useTransactor();

  const [faucetAddress, setFaucetAddress] = useState<Address>();

  const [loading, setLoading] = useState(false);
  const [sellToken, setSellToken] = useState<"CORN" | "ETH">("CORN");
  const [sellValue, setSellValue] = useState("");
  const [buyValue, setBuyValue] = useState("");

  const { writeContractAsync: writeCornContract } = useScaffoldWriteContract({
    contractName: "Corn",
  });

  const { writeContractAsync: writeBasicLendingContract } = useScaffoldWriteContract({
    contractName: "BasicLending",
  });

  useEffect(() => {
    const getFaucetAddress = async () => {
      try {
        const accounts = await localWalletClient.getAddresses();
        setFaucetAddress(accounts[FAUCET_ACCOUNT_INDEX]);
      } catch (error) {
        console.error("⚡️ ~ file: Faucet.tsx:getFaucetAddress ~ error", error);
      }
    };
    getFaucetAddress();
  }, []);

  const handleChangeSellToken = () => {
    setSellToken(sellToken === "CORN" ? "ETH" : "CORN");
    setSellValue("");
    setBuyValue("");
  };

  const ethToToken = (ethAmount: string): string => {
    const tokenAmount = Number(ethAmount) * Number(ETHprice);
    return tokenAmount.toFixed(8);
  };

  const tokenToETH = (tokenAmount: string): string => {
    const ethAmount = Number(tokenAmount) / Number(ETHprice);
    return ethAmount.toFixed(8);
  };

  const handleChangeInput = (isSell: boolean, newValue: string) => {
    if (newValue === "") {
      setSellValue("");
      setBuyValue("");
      return;
    }
    if (isSell) {
      setSellValue(newValue);
      const tokenAmount = sellToken === "ETH" ? ethToToken(newValue) : tokenToETH(newValue);
      setBuyValue(tokenAmount);
    } else {
      setBuyValue(newValue);
      const ethAmount = sellToken === "CORN" ? ethToToken(newValue) : tokenToETH(newValue);
      setSellValue(ethAmount);
    }
  };

  const handleSwap = async () => {
    setLoading(true);
    if (sellToken === "CORN") {
      try {
        await writeCornContract({
          functionName: "transfer",
          args: [burnAddress, parseEther(sellValue)],
        });
        await faucetTxn({
          to: connectedAddress,
          value: parseEther(buyValue as `${number}`),
          account: faucetAddress,
        });

        setSellValue("");
        setBuyValue("");
      } catch (error) {
        console.error("Error sending corn:", error);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await writeTx({
          to: faucetAddress,
          value: parseEther(sellValue as `${number}`),
          account: connectedAddress,
        });
        await writeBasicLendingContract({
          functionName: "borrowCorn",
          args: [parseEther(buyValue)],
        });

        setBuyValue("");
        setSellValue("");
      } catch (error) {
        console.error("Error borrowing corn:", error);
      } finally {
        setLoading(false);
      }
    }
  };
  return (
    <div>
      <input type="checkbox" id={`${modalId}`} className="modal-toggle" />
      <label htmlFor={`${modalId}`} className="modal cursor-pointer">
        <label className="modal-box relative">
          {/* dummy input to capture event onclick on modal box */}
          <input className="h-0 w-0 absolute top-0 left-0" />
          <h3 className="text-xl font-bold mb-3">Simple Swap</h3>
          <label htmlFor={`${modalId}`} className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3">
            ✕
          </label>
          <div className="space-y-3">
            <div className="flex space-x-4">
              <div className="flex flex-col">
                <span className="text-sm font-bold pl-3">Available:</span>
                <div className="flex">
                  <span className="text-sm pl-3">
                    {tokenBalance} {tokenName}
                  </span>
                  <Balance address={connectedAddress as Address} className="min-h-0 h-auto" />
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <div className="flex full-width flex-row">
                <div className="basis-10/12">
                  <IntegerInput
                    value={sellValue}
                    onChange={newValue => {
                      handleChangeInput(true, newValue);
                    }}
                    placeholder={`Sell ${sellToken}`}
                    disableMultiplyBy1e18
                  />
                </div>
                <span className="basis-2/12 flex justify-center items-center text-md">
                  {sellToken === "CORN" ? "CORN" : "ETH"}
                </span>
              </div>
              <div className="flex justify-center">
                <button className="btn btn-circle btn-sm" onClick={handleChangeSellToken}>
                  <ArrowDownIcon className="h-4 w-4 my-0" />
                </button>
              </div>
              <div className="flex full-width flex-row">
                <div className="basis-10/12">
                  <IntegerInput
                    value={buyValue}
                    onChange={newValue => {
                      handleChangeInput(false, newValue);
                    }}
                    placeholder={`Buy ${sellToken === "CORN" ? "ETH" : "CORN"}`}
                    disableMultiplyBy1e18
                  />
                </div>
                <span className="basis-2/12 flex justify-center items-center text-md">
                  {sellToken === "CORN" ? "ETH" : "CORN"}
                </span>
              </div>
              <button className="h-10 btn btn-primary btn-sm px-2 rounded-full" onClick={handleSwap} disabled={loading}>
                {!loading ? (
                  <ArrowsRightLeftIcon className="h-6 w-6" />
                ) : (
                  <span className="loading loading-spinner loading-sm"></span>
                )}
                <span>Swap</span>
              </button>
            </div>
          </div>
        </label>
      </label>
    </div>
  );
};
