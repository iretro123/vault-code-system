import Capacitor

class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(StoreKitMembershipPlugin())
        CAPLog.print("Vault OS registered StoreKitMembershipPlugin")
    }
}
