package com.imolive.paymentbridge

import android.app.Application

class App: Application() {
    override fun onCreate() { super.onCreate(); ctx = this }
    companion object { lateinit var ctx: App }
}
