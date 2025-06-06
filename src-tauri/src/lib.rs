use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum ClientRequest {
    #[serde(rename = "create")]
    Create { id: String },
    #[serde(rename = "connect")]
    Connect { id: String, addr: String },
    #[serde(rename = "disconnect")]
    Disconnect { id: String },
    #[serde(rename = "send")]
    Send { id: String, msg: String, date: DateTime<Utc> },
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum ServerResponse {
    #[serde(rename = "ok")]
    Ok,
    #[serde(rename = "error")]
    Error,
    #[serde(rename = "create")]
    Create { status: String, addr: String },
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum RoomRequest {
    #[serde(rename = "send")]
    Send { id: String, msg: String, addr: String, date: DateTime<Utc> },
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum RoomResponse {
    #[serde(rename = "ok")]
    Ok,
    #[serde(rename = "error")]
    Error,
}

struct AppState {
    stream: Mutex<Option<TcpStream>>,
    room_addr: Mutex<Option<String>>,
    client_id: Mutex<String>, // Добавляем хранение ID клиента
}

#[tauri::command]
fn create_room(state: State<AppState>, _app: AppHandle) -> Result<ServerResponse, String> {
    let mut stream = TcpStream::connect("127.0.0.1:8000")
        .map_err(|e| e.to_string())?;
    
    // Генерируем новый UUID для клиента
    let client_id = Uuid::new_v4().to_string();
    *state.client_id.lock().unwrap() = client_id.clone();
    
    let request = ClientRequest::Create { id: client_id };
    let request_json = serde_json::to_string(&request).map_err(|e| e.to_string())?;
    stream
        .write_all(request_json.as_bytes())
        .map_err(|e| e.to_string())?;
    stream.flush().map_err(|e| e.to_string())?;

    let mut buffer = [0; 1024];
    let n = stream.read(&mut buffer).map_err(|e| e.to_string())?;
    let response: ServerResponse = serde_json::from_slice(&buffer[..n])
        .map_err(|e| e.to_string())?;

    if let ServerResponse::Create { status, addr } = &response {
        if status == "ok" {
            *state.room_addr.lock().unwrap() = Some(addr.clone());
            *state.stream.lock().unwrap() = Some(stream);
        }
    }

    Ok(response)
}

#[tauri::command]
fn connect_room(
    addr: String,
    state: State<AppState>,
    app: AppHandle,
) -> Result<ServerResponse, String> {
    let mut stream = state
        .stream
        .lock()
        .unwrap()
        .take()
        .ok_or("No active connection")?;
    
    let client_id = state.client_id.lock().unwrap().clone();

    let request = ClientRequest::Connect { id: client_id, addr };
    let request_json = serde_json::to_string(&request).map_err(|e| e.to_string())?;
    stream
        .write_all(request_json.as_bytes())
        .map_err(|e| e.to_string())?;
    stream.flush().map_err(|e| e.to_string())?;

    let mut buffer = [0; 1024];
    let n = stream.read(&mut buffer).map_err(|e| e.to_string())?;
    let response: ServerResponse = serde_json::from_slice(&buffer[..n])
        .map_err(|e| e.to_string())?;

    if matches!(response, ServerResponse::Ok) {
        let cloned_stream = stream.try_clone().map_err(|e| e.to_string())?;
        *state.stream.lock().unwrap() = Some(stream);
        start_message_listener(cloned_stream, app);
    }

    Ok(response)
}

#[tauri::command]
fn disconnect_room(state: State<AppState>) -> Result<ServerResponse, String> {
    let mut stream = state
        .stream
        .lock()
        .unwrap()
        .take()
        .ok_or("No active connection")?;
    
    let client_id = state.client_id.lock().unwrap().clone();

    let request = ClientRequest::Disconnect { id: client_id };
    let request_json = serde_json::to_string(&request).map_err(|e| e.to_string())?;
    stream
        .write_all(request_json.as_bytes())
        .map_err(|e| e.to_string())?;
    stream.flush().map_err(|e| e.to_string())?;

    let mut buffer = [0; 1024];
    let n = stream.read(&mut buffer).map_err(|e| e.to_string())?;
    let response: ServerResponse = serde_json::from_slice(&buffer[..n])
        .map_err(|e| e.to_string())?;

    *state.room_addr.lock().unwrap() = None;

    Ok(response)
}

#[tauri::command]
fn send_message(
    msg: String,
    state: State<AppState>,
) -> Result<ServerResponse, String> {
    if msg.len() > 1024 {
        return Err("Message too long".to_string());
    }

    let mut stream = state
        .stream
        .lock()
        .unwrap()
        .as_ref()
        .ok_or("No active connection")?
        .try_clone()
        .map_err(|e| e.to_string())?;
    
    let client_id = state.client_id.lock().unwrap().clone();

    let request = ClientRequest::Send {
        id: client_id,
        msg,
        date: Utc::now(),
    };
    let request_json = serde_json::to_string(&request).map_err(|e| e.to_string())?;
    stream
        .write_all(request_json.as_bytes())
        .map_err(|e| e.to_string())?;
    stream.flush().map_err(|e| e.to_string())?;

    let mut buffer = [0; 1024];
    let n = stream.read(&mut buffer).map_err(|e| e.to_string())?;
    let response: ServerResponse = serde_json::from_slice(&buffer[..n])
        .map_err(|e| e.to_string())?;

    Ok(response)
}

fn start_message_listener(mut stream: TcpStream, app: AppHandle) {
    std::thread::spawn(move || {
        let mut buffer = [0; 1024];
        loop {
            match stream.read(&mut buffer) {
                Ok(n) if n > 0 => {
                    if let Ok(request) = serde_json::from_slice::<RoomRequest>(&buffer[..n]) {
                        let RoomRequest::Send { id, msg, addr: _addr, date } = request;
                        let message = Message {
                            id: date.timestamp().to_string(),
                            content: msg,
                            sender: id, // Теперь используем переданный ID отправителя
                            timestamp: date,
                        };
                        app.emit("new-message", message)
                            .expect("Failed to emit message");
                        
                        let response = RoomResponse::Ok;
                        let response_json = serde_json::to_string(&response).unwrap();
                        stream.write_all(response_json.as_bytes()).unwrap();
                        stream.flush().unwrap();
                    }
                }
                Ok(_) => break, // Connection closed
                Err(_) => break, // Error
            }
        }
    });
}

#[derive(Serialize, Clone)]
pub struct Message {
    id: String,
    content: String,
    sender: String,
    timestamp: DateTime<Utc>,
}

pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            stream: Mutex::new(None),
            room_addr: Mutex::new(None),
            client_id: Mutex::new(Uuid::new_v4().to_string()), // Инициализируем UUID при старте
        })
        .invoke_handler(tauri::generate_handler![
            create_room,
            connect_room,
            disconnect_room,
            send_message
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}