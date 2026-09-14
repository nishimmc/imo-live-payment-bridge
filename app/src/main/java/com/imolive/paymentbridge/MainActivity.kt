package com.imolive.paymentbridge

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.util.concurrent.Executors

class MainActivity: AppCompatActivity() {
    private lateinit var url: EditText; private lateinit var token: EditText; private lateinit var bk: EditText; private lateinit var ng: EditText; private lateinit var status: TextView
    private val io=Executors.newSingleThreadExecutor()
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); buildUi(); requestSmsPermissions(); PeriodicSync.schedule(this); refreshStatus() }
    private fun buildUi(){
        val box=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(40,40,40,40)}
        box.addView(TextView(this).apply{text="ImoLive Payment Bridge";textSize=24f;setPadding(0,0,0,18)})
        status=TextView(this).apply{textSize=14f;setPadding(0,0,0,18)};box.addView(status)
        url=field("Server URL (HTTPS)",Config.serverUrl);token=field("Payment device token",Config.deviceToken);bk=field("bKash SMS sender (optional)",Config.bkashSender);ng=field("Nagad SMS sender (optional)",Config.nagadSender)
        box.addView(url);box.addView(token);box.addView(bk);box.addView(ng)
        val save=Button(this).apply{text="Save Settings";setOnClickListener{saveConfig();status.text="Settings saved. Now test the connection."}};box.addView(save)
        val test=Button(this).apply{text="TEST SERVER CONNECTION";setOnClickListener{saveConfig();status.text="Testing server...";io.execute{val r=ApiClient.testConnection();runOnUiThread{Config.lastResult=r;status.text=r+"\n\nLast sync: "+Config.lastSync+"\nLast SMS: "+Config.lastSms}}}};box.addView(test)
        val perm=Button(this).apply{text="Grant SMS permissions";setOnClickListener{requestSmsPermissions()}};box.addView(perm)
        val info=TextView(this).apply{text="Device ID: ${Config.deviceId}\n\nUse only on the dedicated payment phone. Keep internet available and disable battery optimization for this app.";setPadding(0,20,0,0)};box.addView(info)
        setContentView(ScrollView(this).apply{addView(box)})
    }
    private fun saveConfig(){Config.serverUrl=url.text.toString();Config.deviceToken=token.text.toString();Config.bkashSender=bk.text.toString();Config.nagadSender=ng.text.toString()}
    private fun refreshStatus(){status.text="SMS permission: "+(if(hasSmsPermissions())"GRANTED" else "REQUIRED")+"\nServer: "+(if(Config.serverUrl.isBlank())"NOT CONFIGURED" else Config.serverUrl)+"\nLast result: "+Config.lastResult}
    private fun field(h:String,v:String)=EditText(this).apply{hint=h;setText(v);setSingleLine(true);setPadding(0,12,0,12)}
    private fun hasSmsPermissions()=ContextCompat.checkSelfPermission(this,Manifest.permission.RECEIVE_SMS)==PackageManager.PERMISSION_GRANTED&&ContextCompat.checkSelfPermission(this,Manifest.permission.READ_SMS)==PackageManager.PERMISSION_GRANTED
    private fun requestSmsPermissions(){ActivityCompat.requestPermissions(this,arrayOf(Manifest.permission.RECEIVE_SMS,Manifest.permission.READ_SMS),7001)}
    override fun onDestroy(){io.shutdownNow();super.onDestroy()}
}
