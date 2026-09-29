
// Notification adapter only. All original calculations, plots and box mutations above
// remain unchanged. This block observes the final boxes; it never creates a zone.
vtaFeedEnabled = input.bool(true, "Local Bitcoin chart updates", group="Academy notifications")
vtaFeedChart = syminfo.tickerid == "COINBASE:BTCUSD" and (timeframe.period == "5" or timeframe.period == "15")
vtaSend(string zone, string event, bool demand, float bottom, float top, int sequence) =>
    string eventId = zone + ":" + event + ":" + str.tostring(sequence)
    string payload = '{"id":"' + eventId + '","zoneId":"' + zone + '","symbol":"COINBASE:BTCUSD","timeframe":' + timeframe.period + ',"kind":"' + event + '","side":"' + (demand ? "demand" : "supply") + '","lower":' + str.tostring(bottom, format.mintick) + ',"upper":' + str.tostring(top, format.mintick) + ',"price":' + str.tostring(close, format.mintick) + ',"at":' + str.tostring(timenow) + ',"confirmed":' + (barstate.isconfirmed ? "true" : "false") + ',"trend":"unknown"}'
    alert(payload, alert.freq_all)
vtaObserve(box originalBox, bool demand) =>
    varip string observed = ""
    varip string observedKey = ""
    varip float lastBottom = na
    varip float lastTop = na
    varip bool wasInside = false
    varip int sequence = 0
    if vtaFeedEnabled and vtaFeedChart and barstate.isrealtime
        string current = na(originalBox) ? "" : "vta:" + timeframe.period + ":" + (demand ? "d:" : "s:") + str.tostring(box.get_left(originalBox)) + ":" + str.tostring(int(box.get_top(originalBox) / syminfo.mintick)) + ":" + str.tostring(int(box.get_bottom(originalBox) / syminfo.mintick))
        if current != observedKey
            if observed != ""
                bool beyond = demand ? close < lastBottom : close > lastTop
                vtaSend(observed, beyond and barstate.isconfirmed ? "broken" : "retired", demand, lastBottom, lastTop, sequence)
                sequence += 1
            observedKey := current
            observed := current == "" ? "" : current + ":" + str.tostring(timenow)
            wasInside := false
            if current != ""
                lastBottom := box.get_bottom(originalBox)
                lastTop := box.get_top(originalBox)
                vtaSend(observed, "created", demand, lastBottom, lastTop, sequence)
                sequence += 1
        if observed != ""
            bool insideNow = close >= lastBottom and close <= lastTop
            if insideNow and not wasInside
                vtaSend(observed, "entered", demand, lastBottom, lastTop, sequence)
                sequence += 1
            wasInside := insideNow
vtaObserve(demandBox, true)
vtaObserve(supplyBox, false)
