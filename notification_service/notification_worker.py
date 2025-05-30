# notification_service/notification_worker.py
import pika
import os
import json
import time
import logging


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("notification-service")

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
QUEUE_NAME = "notifications"

def process_notification(notification_data):
    try:
        data = json.loads(notification_data)
        event_type = data.get("event")
        
        if event_type == "post_created":
            logger.info(f"Nowe ogłoszenie: '{data.get('title')}' dodane przez {data.get('author')}")
        else:
            logger.info(f"Otrzymano powiadomienie typu: {event_type}")

        return True
    except Exception as e:
        logger.error(f"Błąd przetwarzania powiadomienia: {str(e)}")
        return False

def callback(ch, method, properties, body):
    notification = body.decode()
    logger.info(f"Otrzymano: {notification}")
    
    success = process_notification(notification)
    if success:
        ch.basic_ack(delivery_tag=method.delivery_tag)
    else:
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

def main():
    max_retries = 10
    retry_delay = 5 
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Próba połączenia z RabbitMQ ({attempt+1}/{max_retries})...")
            connection = pika.BlockingConnection(pika.ConnectionParameters(RABBITMQ_HOST))
            channel = connection.channel()
            channel.queue_declare(queue=QUEUE_NAME, durable=True)
            
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(
                queue=QUEUE_NAME, 
                on_message_callback=callback
            )

            logger.info("Notification service uruchomiony. Oczekiwanie na wiadomości...")
            channel.start_consuming()
            break
        except pika.exceptions.AMQPConnectionError as e:
            logger.error(f"Błąd połączenia z RabbitMQ: {e}")
            if attempt < max_retries - 1:
                logger.info(f"Ponowna próba za {retry_delay} sekund...")
                time.sleep(retry_delay)
            else:
                logger.error("Przekroczono maksymalną liczbę prób połączenia")
                raise

if __name__ == "__main__":
    main()